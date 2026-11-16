import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import Icon from '../Icon'
import ConfirmDialog from '../ConfirmDialog'
import FornecedorFormDialog from './FornecedorFormDialog'
import PromptFormDialog from './PromptFormDialog'
import PromptUseDialog from './PromptUseDialog'
import type { AppData, Fornecedor, Prompt, Video } from '../../data'
import { CATEGORIAS_PROMPT } from '../../store/schema'
import { extrairVariaveis, filtrarPrompts } from '../../store/ia'
import type { FiltroCategoria } from '../../store/ia'
import { guardarPorId, proximoIdDe, removerPorId } from '../../store/videos'
import { COMANDO_SERVIDOR, verificarServidor } from '../../services/ai'
import type { EstadoIA } from '../../services/ai'

interface IAAreaProps {
  fornecedores: Fornecedor[]
  prompts: Prompt[]
  videos: Video[]
  onAlterar: (parcial: Partial<Pick<AppData, 'fornecedores' | 'prompts'>>) => void
  avisar: (texto: string, tipo?: 'ok' | 'erro') => void
  copiar: (texto: string) => Promise<boolean>
}

type AEliminar = { tipo: 'fornecedor'; item: Fornecedor } | { tipo: 'prompt'; item: Prompt } | null

/** Área de IA: fornecedores (sem chaves) e biblioteca de prompts. Carregada só quando se abre a área. */
export default function IAArea({ fornecedores, prompts, videos, onAlterar, avisar, copiar }: IAAreaProps) {
  const [filtro, setFiltro] = useState<FiltroCategoria>('todas')
  const [editorF, setEditorF] = useState<{ item: Fornecedor | null } | null>(null)
  const [editorP, setEditorP] = useState<{ item: Prompt | null } | null>(null)
  const [aUsar, setAUsar] = useState<Prompt | null>(null)
  const [aEliminar, setAEliminar] = useState<AEliminar>(null)
  /** null = a verificar. */
  const [estadoIA, setEstadoIA] = useState<EstadoIA | null>(null)

  // Ao abrir a área: verifica (uma vez) se o servidor local está ligado.
  useEffect(() => {
    let ativo = true
    verificarServidor().then((e) => {
      if (ativo) setEstadoIA(e)
    })
    return () => {
      ativo = false
    }
  }, [])

  const verificarDeNovo = async () => {
    setEstadoIA(null)
    setEstadoIA(await verificarServidor())
  }

  const iaPronta = estadoIA?.ligado === true && estadoIA.configurado
  const lista = filtrarPrompts(prompts, filtro)

  const guardarFornecedor = (f: Fornecedor) => {
    const existia = fornecedores.some((x) => x.id === f.id)
    onAlterar({ fornecedores: guardarPorId(fornecedores, f) })
    setEditorF(null)
    avisar(existia ? `"${f.nome}" atualizado.` : `"${f.nome}" adicionado.`)
  }

  const guardarPrompt = (p: Prompt) => {
    const existia = prompts.some((x) => x.id === p.id)
    onAlterar({ prompts: guardarPorId(prompts, p) })
    setEditorP(null)
    avisar(existia ? `"${p.titulo}" atualizado.` : `"${p.titulo}" criado.`)
  }

  const copiarPrompt = async (texto: string) => {
    const ok = await copiar(texto)
    if (ok) avisar('Prompt copiado. Cola-o no serviço de IA que usas (Ctrl+V).')
    else avisar('Não foi possível copiar o prompt.', 'erro')
  }

  const confirmarEliminacao = () => {
    if (aEliminar?.tipo === 'fornecedor') {
      onAlterar({ fornecedores: removerPorId(fornecedores, aEliminar.item.id) })
      avisar(`"${aEliminar.item.nome}" removido.`)
    } else if (aEliminar?.tipo === 'prompt') {
      onAlterar({ prompts: removerPorId(prompts, aEliminar.item.id) })
      avisar(`"${aEliminar.item.titulo}" eliminado.`)
    }
    setAEliminar(null)
  }

  const contagem = (c: FiltroCategoria) => (c === 'todas' ? prompts.length : prompts.filter((p) => p.categoria === c).length)

  return (
    <>
      <section className="card panel ia-security fade-in" aria-labelledby="ia-sec-title">
        <h2 id="ia-sec-title" className="section-title">
          <Icon name="lock" size={18} /> Chaves API e segurança
        </h2>
        <ul className="ia-rules">
          <li>As chaves API nunca são guardadas nesta app, no navegador nem no código.</li>
          <li>
            Ficam no ficheiro <code>.env</code> de um servidor local (modelo em <code>.env.example</code>; o <code>.env</code> está no{' '}
            <code>.gitignore</code>).
          </li>
          <li>
            Se escreveres algo parecido com uma chave (ex.: <code>sk-…</code>) num campo, a app recusa guardar.
          </li>
        </ul>
        <div className="ia-status">
          <p className="data-status" role="status">
            <span className={iaPronta ? 'ok-dot' : 'warn-dot'} aria-hidden="true" />
            {estadoIA === null && 'A verificar o servidor local…'}
            {estadoIA?.ligado === false && 'Servidor local desligado — modo copiar e colar.'}
            {estadoIA?.ligado === true && !estadoIA.configurado && 'Servidor local ligado, mas falta ANTHROPIC_API_KEY no ficheiro .env.'}
            {estadoIA?.ligado === true && estadoIA.configurado && `Servidor local ligado · modelo ${estadoIA.modelo}`}
          </p>
          <button type="button" className="btn" onClick={verificarDeNovo} disabled={estadoIA === null}>
            <Icon name="refresh" size={16} /> Verificar
          </button>
        </div>
        {estadoIA?.ligado === false && (
          <p className="muted">
            Para gerar texto diretamente aqui, abre um terminal na pasta do projeto e executa <code>{COMANDO_SERVIDOR}</code>.
          </p>
        )}
      </section>

      <section className="card panel ia-panel fade-in" aria-labelledby="prov-title">
        <div className="panel-head">
          <h2 id="prov-title" className="section-title">
            <Icon name="cpu" size={18} /> Fornecedores de IA
          </h2>
          <button type="button" className="btn btn-primary" onClick={() => setEditorF({ item: null })}>
            <Icon name="plus" size={16} /> Novo fornecedor
          </button>
        </div>
        {fornecedores.length === 0 ? (
          <p className="empty">Ainda não há fornecedores configurados.</p>
        ) : (
          <ul className="providers">
            {fornecedores.map((f) => (
              <li key={f.id} className="provider">
                <div className="script-info">
                  <strong>{f.nome}</strong>
                  <span className="chips-sm">
                    <span className="chip-sm">{f.modelo}</span>
                  </span>
                  <code className="project-path" title={f.endpoint}>
                    {f.endpoint}
                  </code>
                  {f.notas && <p>{f.notas}</p>}
                </div>
                <div className="project-actions">
                  <button type="button" className="icon-btn sm" onClick={() => setEditorF({ item: f })} aria-label={`Editar fornecedor ${f.nome}`} title="Editar">
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn sm danger"
                    onClick={() => setAEliminar({ tipo: 'fornecedor', item: f })}
                    aria-label={`Eliminar fornecedor ${f.nome}`}
                    title="Eliminar"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card panel ia-panel fade-in" aria-labelledby="prompts-title">
        <div className="panel-head">
          <h2 id="prompts-title" className="section-title">
            <Icon name="sparkles" size={18} /> Biblioteca de prompts
          </h2>
          <button type="button" className="btn btn-primary" onClick={() => setEditorP({ item: null })}>
            <Icon name="plus" size={16} /> Novo prompt
          </button>
        </div>
        <div className="tabs" role="group" aria-label="Filtrar por categoria">
          {(['todas', ...CATEGORIAS_PROMPT] as FiltroCategoria[]).map((c) => (
            <button key={c} type="button" className={`tab${filtro === c ? ' active' : ''}`} aria-pressed={filtro === c} onClick={() => setFiltro(c)}>
              {c === 'todas' ? 'Todas' : c} <span className="tab-count">{contagem(c)}</span>
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <p className="empty">Nenhum prompt nesta categoria.</p>
        ) : (
          <ul className="prompts">
            {lista.map((p, i) => {
              const vars = extrairVariaveis(p.texto)
              return (
                <li key={p.id} className="prompt-item fade-in" style={{ '--i': i } as CSSProperties}>
                  <div className="script-info">
                    <strong>{p.titulo}</strong>
                    <span className="chips-sm">
                      <span className="chip-sm cat">{p.categoria}</span>
                      {vars.map((v) => (
                        <span key={v} className="chip-sm">{`{${v}}`}</span>
                      ))}
                    </span>
                    <p className="prompt-excerpt">{p.texto}</p>
                  </div>
                  <div className="project-actions">
                    <button type="button" className="btn" onClick={() => setAUsar(p)} aria-label={`Usar prompt ${p.titulo}`}>
                      <Icon name="sparkles" size={16} /> Usar
                    </button>
                    <button type="button" className="icon-btn sm" onClick={() => setEditorP({ item: p })} aria-label={`Editar prompt ${p.titulo}`} title="Editar">
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn sm danger"
                      onClick={() => setAEliminar({ tipo: 'prompt', item: p })}
                      aria-label={`Eliminar prompt ${p.titulo}`}
                      title="Eliminar"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {editorF && (
        <FornecedorFormDialog
          key={editorF.item?.id ?? 'novo'}
          fornecedor={editorF.item}
          novoId={proximoIdDe(fornecedores)}
          onGuardar={guardarFornecedor}
          onCancelar={() => setEditorF(null)}
        />
      )}
      {editorP && (
        <PromptFormDialog
          key={editorP.item?.id ?? 'novo'}
          prompt={editorP.item}
          novoId={proximoIdDe(prompts)}
          onGuardar={guardarPrompt}
          onCancelar={() => setEditorP(null)}
        />
      )}
      {aUsar && (
        <PromptUseDialog
          key={aUsar.id}
          prompt={aUsar}
          videos={videos}
          iaPronta={iaPronta}
          onCopiar={copiarPrompt}
          onCopiarResposta={async (texto) => {
            const ok = await copiar(texto)
            avisar(ok ? 'Resposta copiada.' : 'Não foi possível copiar a resposta.', ok ? 'ok' : 'erro')
          }}
          onFechar={() => setAUsar(null)}
        />
      )}

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo={aEliminar?.tipo === 'fornecedor' ? 'Eliminar fornecedor?' : 'Eliminar prompt?'}
        textoConfirmar="Eliminar da app"
        perigo
        onConfirmar={confirmarEliminacao}
        onCancelar={() => setAEliminar(null)}
      >
        {aEliminar && (
          <dl className="confirm-info">
            <dt>{aEliminar.tipo === 'fornecedor' ? 'Fornecedor' : 'Prompt'}</dt>
            <dd>{aEliminar.tipo === 'fornecedor' ? aEliminar.item.nome : aEliminar.item.titulo}</dd>
          </dl>
        )}
        <p className="muted">O registo é removido apenas desta app.</p>
      </ConfirmDialog>
    </>
  )
}
