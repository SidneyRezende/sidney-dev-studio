import { useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon'

interface ConfirmDialogProps {
  aberto: boolean
  titulo: string
  children: ReactNode
  textoConfirmar: string
  perigo?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Janela de confirmação com o <dialog> nativo do navegador (Esc ou clique fora cancela). */
export default function ConfirmDialog({
  aberto,
  titulo,
  children,
  textoConfirmar,
  perigo = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  // useLayoutEffect: abre/fecha antes de pintar, sem "piscar" o conteúdo.
  useLayoutEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={tituloId}
      onCancel={(e) => {
        e.preventDefault()
        onCancelar()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar()
      }}
    >
      {aberto && (
        <div className="dialog-body">
          <h2 id={tituloId} className="section-title">
            {perigo && <Icon name="alert" size={18} />} {titulo}
          </h2>
          <div className="dialog-text">{children}</div>
          <div className="btn-row end">
            <button type="button" className="btn" onClick={onCancelar} autoFocus>
              Cancelar
            </button>
            <button type="button" className={`btn ${perigo ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirmar}>
              {textoConfirmar}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
