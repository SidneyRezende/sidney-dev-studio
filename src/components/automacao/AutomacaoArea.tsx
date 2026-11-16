import { useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import Icon from '../Icon'
import ScriptViewerDialog from './ScriptViewerDialog'
import type { Visualizacao } from './ScriptViewerDialog'
import type { Script } from '../../data'
import { EXTENSOES, comandoScript, decodificarTexto, filtrarScripts, linguagemPorExtensao } from '../../store/scripts'
import type { FiltroLinguagem } from '../../store/scripts'

export interface AcoesAutomacao {
  novo: () => void
  editar: (s: Script) => void
  eliminar: (s: Script) => void
  copiarComando: (s: Script) => void
  importarPasta: () => void
}

interface AutomacaoAreaProps {
  scripts: Script[]
  acoes: AcoesAutomacao
  aAnalisar: boolean
}

const MAX_BYTES_VISUALIZAR = 1024 * 1024

/** Catálogo de scripts. Carregado só quando se abre a área Automação. */
export default function AutomacaoArea({ scripts, acoes, aAnalisar }: AutomacaoAreaProps) {
  const [filtro, setFiltro] = useState<FiltroLinguagem>('todos')
  const [pesquisa, setPesquisa] = useState('')
  const [visualizacao, setVisualizacao] = useState<Visualizacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendente = useRef<Script | null>(null)

  const lista = filtrarScripts(scripts, filtro, pesquisa)
  const contagem = {
    todos: scripts.length,
    Python: scripts.filter((s) => s.linguagem === 'Python').length,
    PowerShell: scripts.filter((s) => s.linguagem === 'PowerShell').length,
  }

  // "Consultar": o utilizador escolhe o ficheiro na janela do navegador.
  const consultar = (s: Script) => {
    setErro(null)
    pendente.current = s
    if (inputRef.current) {
      inputRef.current.accept = EXTENSOES[s.linguagem].join(',')
      inputRef.current.click()
    }
  }

  const aoEscolherFicheiro = async (e: ChangeEvent<HTMLInputElement>) => {
    const ficheiro = e.target.files?.[0]
    e.target.value = ''
    const s = pendente.current
    if (!ficheiro || !s) return
    if (!linguagemPorExtensao(ficheiro.name)) {
      setErro('Só é possível consultar ficheiros .py, .pyw ou .ps1.')
      return
    }
    if (ficheiro.size > MAX_BYTES_VISUALIZAR) {
      setErro(`«${ficheiro.name}» tem mais de 1 MB — demasiado grande para visualizar aqui.`)
      return
    }
    const texto = decodificarTexto(new Uint8Array(await ficheiro.arrayBuffer()))
    setVisualizacao({ script: s, ficheiro: ficheiro.name, bytes: ficheiro.size, texto })
  }

  const filtros: { id: FiltroLinguagem; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'Python', label: 'Python' },
    { id: 'PowerShell', label: 'PowerShell' },
  ]

  return (
    <section className="card panel auto-panel fade-in" aria-labelledby="scripts-title">
      <div className="panel-head">
        <div>
          <h2 id="scripts-title" className="section-title">
            <Icon name="terminal" size={18} /> Scripts
          </h2>
          <p className="muted">Catálogo de scripts Python e PowerShell</p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={acoes.importarPasta} disabled={aAnalisar}>
            <Icon name="folder" size={16} /> {aAnalisar ? 'A ler pasta…' : 'Importar da pasta'}
          </button>
          <button type="button" className="btn btn-primary" onClick={acoes.novo}>
            <Icon name="plus" size={16} /> Novo script
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Filtrar por linguagem">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`tab${filtro === f.id ? ' active' : ''}`}
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
            >
              {f.label} <span className="tab-count">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar scripts"
            aria-label="Pesquisar scripts"
          />
        </label>
      </div>

      {erro && (
        <p className="notice erro" role="alert">
          {erro}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="empty">{scripts.length === 0 ? 'Ainda não há scripts. Adiciona um ou importa de uma pasta.' : 'Nenhum script corresponde ao filtro.'}</p>
      ) : (
        <ul className="scripts">
          {lista.map((s, i) => (
            <li key={s.id} className="script fade-in" style={{ '--i': i } as CSSProperties}>
              <span className={`lang lang-${s.linguagem === 'Python' ? 'py' : 'ps'}`} title={s.linguagem}>
                {s.linguagem === 'Python' ? 'PY' : 'PS'}
              </span>
              <div className="script-info">
                <strong>{s.nome}</strong>
                {s.descricao && <p>{s.descricao}</p>}
                <code className="project-path" title={s.caminho}>
                  {s.caminho}
                </code>
                <code className="script-cmd" title="Comando">
                  {comandoScript(s)}
                </code>
              </div>
              <div className="project-actions">
                <button type="button" className="icon-btn sm" onClick={() => consultar(s)} aria-label={`Consultar ${s.nome}`} title="Consultar (só leitura)">
                  <Icon name="eye" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn sm"
                  onClick={() => acoes.copiarComando(s)}
                  aria-label={`Copiar comando de ${s.nome}`}
                  title="Copiar comando"
                >
                  <Icon name="terminal" size={16} />
                </button>
                <button type="button" className="icon-btn sm" onClick={() => acoes.editar(s)} aria-label={`Editar script ${s.nome}`} title="Editar">
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn sm danger"
                  onClick={() => acoes.eliminar(s)}
                  aria-label={`Eliminar script ${s.nome}`}
                  title="Eliminar do catálogo"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="hint auto-hint">
        <p>
          <Icon name="lock" size={14} /> <strong>A app nunca executa scripts.</strong> Copia o comando e cola-o num terminal (Ctrl+V).
        </p>
        <p className="muted">
          Se o PowerShell bloquear a execução, podes acrescentar <code>-ExecutionPolicy Bypass</code> ao comando: afeta só essa execução e não
          altera a configuração do Windows.
        </p>
      </div>

      <input ref={inputRef} type="file" hidden onChange={aoEscolherFicheiro} />

      {visualizacao && (
        <ScriptViewerDialog dados={visualizacao} onCopiarComando={acoes.copiarComando} onFechar={() => setVisualizacao(null)} />
      )}
    </section>
  )
}
