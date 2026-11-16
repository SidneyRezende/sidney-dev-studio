import { Suspense, lazy, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import AreaView from './components/AreaView'
import Icon from './components/Icon'
import ConfirmDialog from './components/ConfirmDialog'
import ProjectFormDialog from './components/ProjectFormDialog'
import ImportDialog from './components/ImportDialog'
import type { AcoesProjeto } from './components/ProjectList'
import type { AcoesYouTube } from './components/youtube/YouTubeArea'
import type { AcoesAutomacao } from './components/automacao/AutomacaoArea'
import { areaPorId, criarDadosIniciais } from './data'
import type { AreaId, Ideia, Projeto, Script, Video, View } from './data'
import { STORAGE_KEY, validarDados } from './store/schema'
import { usePersistentState } from './store/usePersistentState'
import { guardarProjeto, proximoId, removerProjeto } from './store/projetos'
import { construirIdeia, guardarPorId, ideiaParaCampos, moverVideo, proximoIdDe, removerPorId } from './store/videos'
import { comandoVSCode, deduzirPastaProjetos } from './utils/caminhos'
import { copiarTexto } from './utils/clipboard'
import { analisarPasta, escolherPasta, listarScripts, seletorDisponivel } from './utils/pastas'
import type { ResultadoAnalise, ResultadoScripts } from './utils/pastas'
import { comandoScript } from './store/scripts'
import './App.css'

// Carregados só quando são precisos (menos memória no arranque).
const YouTubeArea = lazy(() => import('./components/youtube/YouTubeArea'))
const VideoFormDialog = lazy(() => import('./components/youtube/VideoFormDialog'))
const AutomacaoArea = lazy(() => import('./components/automacao/AutomacaoArea'))
const ScriptFormDialog = lazy(() => import('./components/automacao/ScriptFormDialog'))
const ScriptImportDialog = lazy(() => import('./components/automacao/ScriptImportDialog'))
const IAArea = lazy(() => import('./components/ia/IAArea'))

const hoje = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

type Editor = { projeto: Projeto | null; area?: AreaId } | null
type EditorVideo = { video: Video | null; ideia?: Ideia } | null
type AEliminar =
  | { tipo: 'projeto'; item: Projeto }
  | { tipo: 'video'; item: Video }
  | { tipo: 'ideia'; item: Ideia }
  | { tipo: 'script'; item: Script }
  | null

const TITULO_ELIMINAR = {
  projeto: 'Eliminar projeto?',
  video: 'Eliminar vídeo?',
  ideia: 'Eliminar ideia?',
  script: 'Eliminar script do catálogo?',
} as const

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const { valor: dados, setValor: setDados, estado } = usePersistentState(STORAGE_KEY, criarDadosIniciais, validarDados)

  const [editor, setEditor] = useState<Editor>(null)
  const [editorVideo, setEditorVideo] = useState<EditorVideo>(null)
  const [aEliminar, setAEliminar] = useState<AEliminar>(null)
  const [editorScript, setEditorScript] = useState<{ script: Script | null } | null>(null)
  const [importScripts, setImportScripts] = useState<ResultadoScripts | null>(null)
  const [importacao, setImportacao] = useState<ResultadoAnalise | null>(null)
  const [aAnalisar, setAAnalisar] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'erro' } | null>(null)
  const avisoTimer = useRef<number | undefined>(undefined)

  const mostrarAviso = (texto: string, tipo: 'ok' | 'erro' = 'ok') => {
    setAviso({ texto, tipo })
    window.clearTimeout(avisoTimer.current)
    avisoTimer.current = window.setTimeout(() => setAviso(null), tipo === 'erro' ? 6000 : 3500)
  }

  const navigate = (next: View) => {
    setView(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }

  // ---------- Projetos ----------
  const acoes: AcoesProjeto = {
    editar: (p) => setEditor({ projeto: p }),
    eliminar: (p) => setAEliminar({ tipo: 'projeto', item: p }),
    copiarComando: async (p) => {
      if (!p.pasta) return
      const comando = comandoVSCode(p.pasta)
      const ok = await copiarTexto(comando)
      if (ok) mostrarAviso('Comando copiado. Cola-o num terminal (Ctrl+V).')
      else mostrarAviso(`Não foi possível copiar. Comando: ${comando}`, 'erro')
    },
  }
  const novoProjeto = (area?: AreaId) => setEditor({ projeto: null, area })

  const aoGuardar = (p: Projeto) => {
    const existia = dados.projetos.some((x) => x.id === p.id)
    setDados({ ...dados, projetos: guardarProjeto(dados.projetos, p) })
    setEditor(null)
    mostrarAviso(existia ? `"${p.nome}" atualizado.` : `"${p.nome}" criado.`)
  }

  // Só corre quando o utilizador clica e escolhe uma pasta na janela do navegador.
  const importarPasta = async () => {
    if (!seletorDisponivel()) {
      mostrarAviso('Este navegador não permite escolher pastas. Usa o Microsoft Edge ou o Chrome.', 'erro')
      return
    }
    try {
      const pasta = await escolherPasta()
      if (!pasta) return
      setAAnalisar(true)
      setImportacao(await analisarPasta(pasta))
    } catch {
      mostrarAviso('Não foi possível ler a pasta escolhida.', 'erro')
    } finally {
      setAAnalisar(false)
    }
  }

  const aoImportar = (novos: Projeto[]) => {
    setDados({ ...dados, projetos: [...dados.projetos, ...novos] })
    setImportacao(null)
    mostrarAviso(`${novos.length} ${novos.length === 1 ? 'projeto importado' : 'projetos importados'}.`)
  }

  // ---------- YouTube ----------
  const acoesYouTube: AcoesYouTube = {
    novoVideo: () => setEditorVideo({ video: null }),
    editarVideo: (v) => setEditorVideo({ video: v }),
    eliminarVideo: (v) => setAEliminar({ tipo: 'video', item: v }),
    moverVideo: (v, direcao) => {
      const movido = moverVideo(v, direcao)
      setDados({ ...dados, videos: guardarPorId(dados.videos, movido) })
      mostrarAviso(`"${v.titulo}" → ${movido.estado}`)
    },
    guardarIdeia: (texto) => {
      const r = construirIdeia(texto, proximoIdDe(dados.ideias))
      if (!r.ok) return r.erro
      setDados({ ...dados, ideias: [...dados.ideias, r.valor] })
      mostrarAviso('Ideia guardada.')
      return null
    },
    transformarIdeia: (i) => setEditorVideo({ video: null, ideia: i }),
    eliminarIdeia: (i) => setAEliminar({ tipo: 'ideia', item: i }),
  }

  const aoGuardarVideo = (v: Video) => {
    const existia = dados.videos.some((x) => x.id === v.id)
    const ideia = editorVideo?.ideia
    setDados({
      ...dados,
      videos: guardarPorId(dados.videos, v),
      // Ao transformar uma ideia em vídeo, a ideia sai do banco de ideias.
      ideias: ideia ? removerPorId(dados.ideias, ideia.id) : dados.ideias,
    })
    setEditorVideo(null)
    mostrarAviso(ideia ? 'Ideia transformada em vídeo.' : existia ? `"${v.titulo}" atualizado.` : `"${v.titulo}" criado.`)
  }

  // ---------- Automação (a app nunca executa scripts) ----------
  const acoesAutomacao: AcoesAutomacao = {
    novo: () => setEditorScript({ script: null }),
    editar: (s) => setEditorScript({ script: s }),
    eliminar: (s) => setAEliminar({ tipo: 'script', item: s }),
    copiarComando: async (s) => {
      const comando = comandoScript(s)
      const ok = await copiarTexto(comando)
      if (ok) mostrarAviso('Comando copiado. Cola-o num terminal (Ctrl+V).')
      else mostrarAviso(`Não foi possível copiar. Comando: ${comando}`, 'erro')
    },
    // Só corre quando o utilizador clica e escolhe uma pasta na janela do navegador.
    importarPasta: async () => {
      if (!seletorDisponivel()) {
        mostrarAviso('Este navegador não permite escolher pastas. Usa o Microsoft Edge ou o Chrome.', 'erro')
        return
      }
      try {
        const pasta = await escolherPasta('sds-automacao')
        if (!pasta) return
        setAAnalisar(true)
        setImportScripts(await listarScripts(pasta))
      } catch {
        mostrarAviso('Não foi possível ler a pasta escolhida.', 'erro')
      } finally {
        setAAnalisar(false)
      }
    },
  }

  const aoGuardarScript = (s: Script) => {
    const existia = dados.scripts.some((x) => x.id === s.id)
    setDados({ ...dados, scripts: guardarPorId(dados.scripts, s) })
    setEditorScript(null)
    mostrarAviso(existia ? `"${s.nome}" atualizado.` : `"${s.nome}" adicionado ao catálogo.`)
  }

  const aoImportarScripts = (novos: Script[]) => {
    setDados({ ...dados, scripts: [...dados.scripts, ...novos] })
    setImportScripts(null)
    mostrarAviso(`${novos.length} ${novos.length === 1 ? 'script importado' : 'scripts importados'}.`)
  }

  // ---------- Eliminação (apenas registos da app; nunca ficheiros do disco) ----------
  const confirmarEliminacao = () => {
    if (!aEliminar) return
    if (aEliminar.tipo === 'projeto') {
      setDados({ ...dados, projetos: removerProjeto(dados.projetos, aEliminar.item.id) })
      mostrarAviso(`"${aEliminar.item.nome}" eliminado da app.`)
    } else if (aEliminar.tipo === 'video') {
      setDados({ ...dados, videos: removerPorId(dados.videos, aEliminar.item.id) })
      mostrarAviso(`Vídeo "${aEliminar.item.titulo}" eliminado da app.`)
    } else if (aEliminar.tipo === 'ideia') {
      setDados({ ...dados, ideias: removerPorId(dados.ideias, aEliminar.item.id) })
      mostrarAviso('Ideia eliminada.')
    } else {
      setDados({ ...dados, scripts: removerPorId(dados.scripts, aEliminar.item.id) })
      mostrarAviso(`"${aEliminar.item.nome}" removido do catálogo. O ficheiro não foi tocado.`)
    }
    setAEliminar(null)
  }

  const titulo = view === 'dashboard' ? 'Dashboard' : areaPorId(view).nome
  // Pasta base para sugestões de importação, deduzida dos caminhos que o utilizador já registou.
  const pastaProjetos = deduzirPastaProjetos([...dados.projetos.map((p) => p.pasta), ...dados.scripts.map((s) => s.caminho)])

  return (
    <div className="layout">
      <Sidebar view={view} open={menuOpen} onNavigate={navigate} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="content">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" />
          </button>
          <div>
            <p className="eyebrow">{hoje}</p>
            <h1>{titulo}</h1>
          </div>
          <button
            type="button"
            className="btn btn-primary topbar-new"
            onClick={() => novoProjeto(view === 'dashboard' ? undefined : view)}
            aria-label="Novo projeto"
          >
            <Icon name="plus" size={16} /> <span>Novo projeto</span>
          </button>
          <span className="avatar" title="Sidney">SR</span>
        </header>

        <main key={view} className="main">
          {view === 'dashboard' ? (
            <Dashboard
              dados={dados}
              estado={estado}
              acoes={acoes}
              onNovo={() => novoProjeto()}
              onSubstituir={setDados}
              onOpenArea={navigate}
            />
          ) : (
            <AreaView
              id={view}
              projetos={dados.projetos}
              acoes={acoes}
              onNovo={novoProjeto}
              onBack={() => navigate('dashboard')}
              onImportarPasta={view === 'dev' ? importarPasta : undefined}
              aAnalisar={aAnalisar}
              extra={
                view === 'youtube' ? (
                  <Suspense fallback={<p className="muted carregar">A carregar a área YouTube…</p>}>
                    <YouTubeArea videos={dados.videos} ideias={dados.ideias} acoes={acoesYouTube} />
                  </Suspense>
                ) : view === 'auto' ? (
                  <Suspense fallback={<p className="muted carregar">A carregar a área Automação…</p>}>
                    <AutomacaoArea scripts={dados.scripts} acoes={acoesAutomacao} aAnalisar={aAnalisar} />
                  </Suspense>
                ) : view === 'ia' ? (
                  <Suspense fallback={<p className="muted carregar">A carregar a área de IA…</p>}>
                    <IAArea
                      fornecedores={dados.fornecedores}
                      prompts={dados.prompts}
                      videos={dados.videos}
                      onAlterar={(parcial) => setDados({ ...dados, ...parcial })}
                      avisar={mostrarAviso}
                      copiar={copiarTexto}
                    />
                  </Suspense>
                ) : undefined
              }
            />
          )}
        </main>
      </div>

      {editor && (
        <ProjectFormDialog
          key={editor.projeto?.id ?? 'novo'}
          projeto={editor.projeto}
          areaInicial={editor.area}
          novoId={proximoId(dados.projetos)}
          onGuardar={aoGuardar}
          onCancelar={() => setEditor(null)}
        />
      )}

      {editorVideo && (
        <Suspense fallback={null}>
          <VideoFormDialog
            key={editorVideo.video?.id ?? `novo-${editorVideo.ideia?.id ?? 0}`}
            video={editorVideo.video}
            inicial={editorVideo.ideia ? ideiaParaCampos(editorVideo.ideia) : undefined}
            novoId={proximoIdDe(dados.videos)}
            onGuardar={aoGuardarVideo}
            onCancelar={() => setEditorVideo(null)}
          />
        </Suspense>
      )}

      {editorScript && (
        <Suspense fallback={null}>
          <ScriptFormDialog
            key={editorScript.script?.id ?? 'novo'}
            script={editorScript.script}
            novoId={proximoIdDe(dados.scripts)}
            onGuardar={aoGuardarScript}
            onCancelar={() => setEditorScript(null)}
          />
        </Suspense>
      )}

      {importScripts && (
        <Suspense fallback={null}>
          <ScriptImportDialog
            resultado={importScripts}
            existentes={dados.scripts}
            pastaProjetos={pastaProjetos}
            primeiroId={proximoIdDe(dados.scripts)}
            onImportar={aoImportarScripts}
            onCancelar={() => setImportScripts(null)}
          />
        </Suspense>
      )}

      {importacao && (
        <ImportDialog
          resultado={importacao}
          existentes={dados.projetos}
          pastaProjetos={pastaProjetos}
          primeiroId={proximoId(dados.projetos)}
          onImportar={aoImportar}
          onCancelar={() => setImportacao(null)}
        />
      )}

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo={aEliminar ? TITULO_ELIMINAR[aEliminar.tipo] : ''}
        textoConfirmar="Eliminar da app"
        perigo
        onConfirmar={confirmarEliminacao}
        onCancelar={() => setAEliminar(null)}
      >
        {aEliminar?.tipo === 'projeto' && (
          <>
            <dl className="confirm-info">
              <dt>Nome</dt>
              <dd>{aEliminar.item.nome}</dd>
              <dt>Caminho</dt>
              <dd>{aEliminar.item.pasta ? <code>{aEliminar.item.pasta}</code> : <span className="muted">Sem pasta associada</span>}</dd>
            </dl>
            <p className="muted">
              Só o registo é removido desta app. <strong>Nenhum ficheiro ou pasta do disco é apagado.</strong>
            </p>
          </>
        )}
        {aEliminar?.tipo === 'video' && (
          <>
            <dl className="confirm-info">
              <dt>Título</dt>
              <dd>{aEliminar.item.titulo}</dd>
              <dt>Estado</dt>
              <dd>{aEliminar.item.estado}</dd>
            </dl>
            <p className="muted">
              O título, a descrição e o roteiro são removidos desta app. <strong>Nenhum ficheiro do disco é apagado.</strong>
            </p>
          </>
        )}
        {aEliminar?.tipo === 'ideia' && (
          <>
            <dl className="confirm-info">
              <dt>Ideia</dt>
              <dd>{aEliminar.item.texto}</dd>
            </dl>
            <p className="muted">A ideia é removida do banco de ideias.</p>
          </>
        )}
        {aEliminar?.tipo === 'script' && (
          <>
            <dl className="confirm-info">
              <dt>Nome</dt>
              <dd>{aEliminar.item.nome}</dd>
              <dt>Caminho</dt>
              <dd>
                <code>{aEliminar.item.caminho}</code>
              </dd>
            </dl>
            <p className="muted">
              Só o registo é removido do catálogo. <strong>O ficheiro do script não é apagado.</strong>
            </p>
          </>
        )}
      </ConfirmDialog>

      <div className="toast-zone" aria-live="polite">
        {aviso && <div className={`toast${aviso.tipo === 'erro' ? ' erro' : ''}`}>{aviso.texto}</div>}
      </div>
    </div>
  )
}

export default App
