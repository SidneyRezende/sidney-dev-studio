import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../Icon'
import type { Prompt, Video } from '../../data'
import { extrairVariaveis, preencherPrompt, valoresDoVideo, variaveisEmFalta } from '../../store/ia'
import { MENSAGEM_NAO_LIGADO, gerarTexto } from '../../services/ai'
import type { RespostaIA } from '../../services/ai'

interface Props {
  prompt: Prompt
  videos: Video[]
  /** true quando o servidor local está ligado e tem chave configurada. */
  iaPronta: boolean
  onCopiar: (texto: string) => void
  onCopiarResposta: (texto: string) => void
  onFechar: () => void
}

/** Preenche as variáveis de um prompt; copia-o ou envia-o ao servidor local de IA. */
export default function PromptUseDialog({ prompt, videos, iaPronta, onCopiar, onCopiarResposta, onFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const pedido = useRef<AbortController | null>(null)
  const uid = useId()
  const variaveis = extrairVariaveis(prompt.texto)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [videoId, setVideoId] = useState('')
  const [aGerar, setAGerar] = useState(false)
  const [resposta, setResposta] = useState<RespostaIA | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    // Ao fechar a janela, cancela um pedido em curso.
    return () => pedido.current?.abort()
  }, [])

  const escolherVideo = (id: string) => {
    setVideoId(id)
    const v = videos.find((x) => String(x.id) === id)
    if (!v) return
    const auto = valoresDoVideo(v)
    // Só preenche as variáveis que este prompt usa; mantém o que já foi escrito à mão.
    setValores((atual) => {
      const novo = { ...atual }
      for (const n of variaveis) if (auto[n] !== undefined && !(atual[n] ?? '').trim()) novo[n] = auto[n]
      return novo
    })
  }

  const final = preencherPrompt(prompt.texto, valores)
  const emFalta = variaveisEmFalta(prompt.texto, valores)

  const gerar = async () => {
    pedido.current?.abort()
    const controlo = new AbortController()
    pedido.current = controlo
    setAGerar(true)
    setResposta(null)
    try {
      setResposta(await gerarTexto(final, controlo.signal))
    } catch {
      // Cancelado (janela fechada ou novo pedido): não mostra nada.
    } finally {
      if (pedido.current === controlo) {
        pedido.current = null
        setAGerar(false)
      }
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog-xl"
      aria-labelledby={`${uid}-t`}
      onCancel={(e) => {
        e.preventDefault()
        onFechar()
      }}
    >
      <div className="dialog-body form">
        <div className="panel-head">
          <h2 id={`${uid}-t`} className="section-title">
            <Icon name="sparkles" size={18} /> {prompt.titulo}
          </h2>
          <button type="button" className="icon-btn sm" onClick={onFechar} aria-label="Fechar">
            <Icon name="close" size={16} />
          </button>
        </div>

        {videos.length > 0 && (
          <label className="field">
            <span>Preencher a partir de um vídeo (opcional)</span>
            <select value={videoId} onChange={(e) => escolherVideo(e.target.value)}>
              <option value="">— Nenhum —</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo} ({v.estado})
                </option>
              ))}
            </select>
          </label>
        )}

        {variaveis.length > 0 && (
          <div className="vars">
            {variaveis.map((n) => (
              <label key={n} className="field">
                <span>{`{${n}}`}</span>
                <input
                  value={valores[n] ?? ''}
                  onChange={(e) => setValores((a) => ({ ...a, [n]: e.target.value }))}
                  aria-label={`Variável ${n}`}
                />
              </label>
            ))}
          </div>
        )}

        <div className="field">
          <span className="field-label">
            Prompt final
            <span className="contador">{final.length} caracteres</span>
          </span>
          <pre className="prompt-preview" tabIndex={0}>
            {final}
          </pre>
          {emFalta.length > 0 && <small className="warn-text">Por preencher: {emFalta.map((n) => `{${n}}`).join(', ')}</small>}
        </div>

        {aGerar && (
          <p className="data-status" role="status">
            <span className="warn-dot" aria-hidden="true" /> A gerar resposta… (pode demorar até um minuto)
          </p>
        )}

        {resposta && !resposta.ok && (
          <p className="notice erro" role="alert">
            {resposta.erro}
          </p>
        )}

        {resposta?.ok && (
          <div className="field">
            <span className="field-label">
              Resposta da IA
              <span className="contador">{resposta.modelo}</span>
            </span>
            <pre className="prompt-preview ia-resposta" tabIndex={0}>
              {resposta.texto}
            </pre>
            {resposta.aviso && <small className="warn-text">{resposta.aviso}</small>}
          </div>
        )}

        {!iaPronta && <p className="muted">{MENSAGEM_NAO_LIGADO} Por agora, copia o prompt e cola-o no serviço de IA que usas.</p>}

        <div className="btn-row end">
          <button type="button" className="btn" onClick={onFechar}>
            Fechar
          </button>
          {resposta?.ok && (
            <button type="button" className="btn" onClick={() => onCopiarResposta(resposta.texto)}>
              <Icon name="terminal" size={16} /> Copiar resposta
            </button>
          )}
          <button type="button" className="btn" onClick={() => onCopiar(final)}>
            <Icon name="terminal" size={16} /> Copiar prompt
          </button>
          {iaPronta && (
            <button type="button" className="btn btn-primary" onClick={gerar} disabled={aGerar || emFalta.length > 0}>
              <Icon name="sparkles" size={16} /> {aGerar ? 'A gerar…' : 'Gerar com IA'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
