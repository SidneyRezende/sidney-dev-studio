import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import Icon from '../Icon'
import type { Ideia, Video } from '../../data'
import { ESTADOS_VIDEO, LIMITES } from '../../store/schema'
import { agruparPorEstado, contarPalavras, filtrarVideos } from '../../store/videos'
import { diaPassado, formatarDia, tempoRelativo } from '../../utils/datas'

export interface AcoesYouTube {
  novoVideo: () => void
  editarVideo: (v: Video) => void
  eliminarVideo: (v: Video) => void
  moverVideo: (v: Video, direcao: 1 | -1) => void
  /** Devolve uma mensagem de erro ou null se a ideia foi guardada. */
  guardarIdeia: (texto: string) => string | null
  transformarIdeia: (i: Ideia) => void
  eliminarIdeia: (i: Ideia) => void
}

interface YouTubeAreaProps {
  videos: Video[]
  ideias: Ideia[]
  acoes: AcoesYouTube
}

/** Quadro de produção + banco de ideias. Carregado só quando se abre a área YouTube. */
export default function YouTubeArea({ videos, ideias, acoes }: YouTubeAreaProps) {
  const [pesquisa, setPesquisa] = useState('')
  const [novaIdeia, setNovaIdeia] = useState('')
  const [erroIdeia, setErroIdeia] = useState<string | null>(null)

  const grupos = agruparPorEstado(filtrarVideos(videos, pesquisa))
  const publicados = videos.filter((v) => v.estado === 'Publicado').length
  const ideiasOrdenadas = [...ideias].sort((a, b) => Date.parse(b.criada) - Date.parse(a.criada))

  const guardarIdeia = (e: FormEvent) => {
    e.preventDefault()
    const erro = acoes.guardarIdeia(novaIdeia)
    setErroIdeia(erro)
    if (!erro) setNovaIdeia('')
  }

  return (
    <>
      <section className="card panel yt-panel fade-in" aria-labelledby="yt-board-title">
        <div className="panel-head">
          <div>
            <h2 id="yt-board-title" className="section-title">
              <Icon name="play" size={18} /> Produção de vídeos
            </h2>
            <p className="muted">
              {videos.length} vídeos · {publicados} publicados
            </p>
          </div>
          <div className="btn-row">
            <label className="search">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Pesquisar título ou etiqueta"
                aria-label="Pesquisar vídeos"
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={acoes.novoVideo}>
              <Icon name="plus" size={16} /> Novo vídeo
            </button>
          </div>
        </div>

        <div className="board">
          {ESTADOS_VIDEO.map((estado, col) => (
            <section key={estado} className="board-col" aria-label={`${estado}: ${grupos[estado].length} vídeos`}>
              <h3 className="board-col-title">
                {estado} <span className="tab-count">{grupos[estado].length}</span>
              </h3>
              {grupos[estado].length === 0 && <p className="board-empty">Vazio</p>}
              {grupos[estado].map((v, i) => {
                const palavras = contarPalavras(v.roteiro)
                const atrasado = v.dataPrevista && v.estado !== 'Publicado' && diaPassado(v.dataPrevista)
                return (
                  <article key={v.id} className="video-card fade-in" style={{ '--i': i } as CSSProperties}>
                    <strong className="video-title" title={v.titulo}>
                      {v.titulo}
                    </strong>
                    {v.etiquetas.length > 0 && (
                      <span className="chips-sm">
                        {v.etiquetas.slice(0, 3).map((t) => (
                          <span key={t} className="chip-sm">
                            {t}
                          </span>
                        ))}
                        {v.etiquetas.length > 3 && <span className="chip-sm">+{v.etiquetas.length - 3}</span>}
                      </span>
                    )}
                    {(v.dataPrevista || palavras > 0) && (
                      <div className="video-meta">
                        {v.dataPrevista && (
                          <span className={atrasado ? 'late' : undefined} title={atrasado ? 'Data prevista já passou' : 'Data prevista'}>
                            <Icon name="calendar" size={14} /> {formatarDia(v.dataPrevista)}
                          </span>
                        )}
                        {palavras > 0 && (
                          <span title="Palavras no roteiro">
                            <Icon name="script" size={14} /> {palavras}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="video-actions">
                      <button
                        type="button"
                        className="icon-btn sm"
                        disabled={col === 0}
                        onClick={() => acoes.moverVideo(v, -1)}
                        aria-label={col > 0 ? `Mover ${v.titulo} para ${ESTADOS_VIDEO[col - 1]}` : 'Já está no primeiro estado'}
                        title={col > 0 ? `← ${ESTADOS_VIDEO[col - 1]}` : undefined}
                      >
                        <Icon name="left" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn sm"
                        disabled={col === ESTADOS_VIDEO.length - 1}
                        onClick={() => acoes.moverVideo(v, 1)}
                        aria-label={col < ESTADOS_VIDEO.length - 1 ? `Mover ${v.titulo} para ${ESTADOS_VIDEO[col + 1]}` : 'Já está publicado'}
                        title={col < ESTADOS_VIDEO.length - 1 ? `${ESTADOS_VIDEO[col + 1]} →` : undefined}
                      >
                        <Icon name="right" size={16} />
                      </button>
                      <span className="spacer" />
                      <button type="button" className="icon-btn sm" onClick={() => acoes.editarVideo(v)} aria-label={`Editar vídeo ${v.titulo}`} title="Editar">
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn sm danger"
                        onClick={() => acoes.eliminarVideo(v)}
                        aria-label={`Eliminar vídeo ${v.titulo}`}
                        title="Eliminar"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          ))}
        </div>
        {pesquisa && videos.length > 0 && Object.values(grupos).every((g) => g.length === 0) && (
          <p className="empty">Nenhum vídeo corresponde a "{pesquisa}".</p>
        )}
      </section>

      <section className="card panel ideas-panel fade-in" aria-labelledby="ideas-title">
        <h2 id="ideas-title" className="section-title">
          <Icon name="bulb" size={18} /> Banco de ideias <span className="tab-count">{ideias.length}</span>
        </h2>
        <form className="idea-form" onSubmit={guardarIdeia}>
          <input
            value={novaIdeia}
            onChange={(e) => {
              setErroIdeia(null)
              setNovaIdeia(e.target.value)
            }}
            maxLength={LIMITES.ideia}
            placeholder="Escreve uma ideia e carrega Enter"
            aria-label="Nova ideia"
          />
          <button type="submit" className="btn btn-primary">
            <Icon name="plus" size={16} /> Guardar
          </button>
        </form>
        {erroIdeia && (
          <p className="notice erro" role="alert">
            {erroIdeia}
          </p>
        )}
        {ideiasOrdenadas.length === 0 ? (
          <p className="empty">Ainda não há ideias guardadas.</p>
        ) : (
          <ul className="ideas">
            {ideiasOrdenadas.map((ideia) => (
              <li key={ideia.id} className="idea">
                <div>
                  <p>{ideia.texto}</p>
                  <time className="muted" dateTime={ideia.criada}>
                    {tempoRelativo(ideia.criada)}
                  </time>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn" onClick={() => acoes.transformarIdeia(ideia)} aria-label={`Transformar em vídeo: ${ideia.texto}`}>
                    <Icon name="play" size={16} /> Transformar em vídeo
                  </button>
                  <button
                    type="button"
                    className="icon-btn sm danger"
                    onClick={() => acoes.eliminarIdeia(ideia)}
                    aria-label={`Eliminar ideia: ${ideia.texto}`}
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
    </>
  )
}
