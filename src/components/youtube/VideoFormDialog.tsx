import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../Icon'
import type { EstadoVideo, Video } from '../../data'
import { ESTADOS_VIDEO, LIMITES } from '../../store/schema'
import { construirVideo, contarPalavras, lerListaCSV, minutosNarracao } from '../../store/videos'
import type { CamposVideo } from '../../store/videos'

interface VideoFormDialogProps {
  /** null = novo vídeo. */
  video: Video | null
  /** Valores iniciais para um vídeo novo (ex.: a partir de uma ideia). */
  inicial?: CamposVideo
  novoId: number
  onGuardar: (video: Video) => void
  onCancelar: () => void
}

function Contador({ atual, max }: { atual: number; max: number }) {
  const classe = atual > max ? ' over' : atual >= max * 0.9 ? ' near' : ''
  return (
    <span className={`contador${classe}`} aria-live="polite">
      {atual}/{max}
    </span>
  )
}

function camposDe(video: Video): CamposVideo {
  return {
    titulo: video.titulo,
    descricao: video.descricao,
    etiquetas: video.etiquetas.join(', '),
    dataPrevista: video.dataPrevista ?? '',
    estado: video.estado,
    roteiro: video.roteiro,
  }
}

const VAZIO: CamposVideo = { titulo: '', descricao: '', etiquetas: '', dataPrevista: '', estado: 'Ideia', roteiro: '' }

export default function VideoFormDialog({ video, inicial, novoId, onGuardar, onCancelar }: VideoFormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [c, setC] = useState<CamposVideo>(() => (video ? camposDe(video) : (inicial ?? VAZIO)))
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const alterar = <K extends keyof CamposVideo>(campo: K, valor: CamposVideo[K]) => {
    setErro(null)
    setC((atual) => ({ ...atual, [campo]: valor }))
  }

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    const r = construirVideo(c, video?.id ?? novoId)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    onGuardar(r.valor)
  }

  const totalEtiquetas = lerListaCSV(c.etiquetas).join(',').length
  const palavras = contarPalavras(c.roteiro)

  return (
    <dialog
      ref={ref}
      className="dialog dialog-xl"
      aria-labelledby={`${uid}-t`}
      onCancel={(e) => {
        e.preventDefault()
        onCancelar()
      }}
    >
      <form className="dialog-body form" onSubmit={submeter} noValidate>
        <h2 id={`${uid}-t`} className="section-title">
          <Icon name={video ? 'edit' : 'play'} size={18} /> {video ? 'Editar vídeo' : 'Novo vídeo'}
        </h2>

        <label className="field">
          <span className="field-label">
            Título * <Contador atual={c.titulo.length} max={LIMITES.tituloVideo} />
          </span>
          <input value={c.titulo} onChange={(e) => alterar('titulo', e.target.value)} maxLength={LIMITES.tituloVideo} autoFocus />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Estado de produção</span>
            <select value={c.estado} onChange={(e) => alterar('estado', e.target.value as EstadoVideo)}>
              {ESTADOS_VIDEO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Data prevista (opcional)</span>
            <input type="date" value={c.dataPrevista} onChange={(e) => alterar('dataPrevista', e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">
            Descrição <Contador atual={c.descricao.length} max={LIMITES.descricaoVideo} />
          </span>
          <textarea value={c.descricao} onChange={(e) => alterar('descricao', e.target.value)} maxLength={LIMITES.descricaoVideo} rows={4} />
        </label>

        <label className="field">
          <span className="field-label">
            Etiquetas <Contador atual={totalEtiquetas} max={LIMITES.etiquetasTotal} />
          </span>
          <input value={c.etiquetas} onChange={(e) => alterar('etiquetas', e.target.value)} placeholder="programação, tutorial, react" />
          <small>Separadas por vírgulas. O YouTube permite até 500 caracteres no total.</small>
        </label>

        <label className="field">
          <span className="field-label">
            Roteiro
            <span className="contador">
              {palavras} palavras{palavras > 0 && ` · ≈ ${minutosNarracao(palavras)} min`}
            </span>
          </span>
          <textarea
            className="roteiro"
            value={c.roteiro}
            onChange={(e) => alterar('roteiro', e.target.value)}
            maxLength={LIMITES.roteiro}
            rows={10}
            placeholder={'Gancho:\n\n1. ...\n2. ...\n\nChamada para ação:'}
          />
        </label>

        {erro && (
          <p className="notice erro" role="alert">
            {erro}
          </p>
        )}

        <div className="btn-row end">
          <button type="button" className="btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {video ? 'Guardar alterações' : 'Criar vídeo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
