import { useEffect, useId, useMemo, useRef } from 'react'
import Icon from '../Icon'
import type { Script } from '../../data'
import { nomeFicheiro, numerarLinhas } from '../../store/scripts'

export interface Visualizacao {
  script: Script
  ficheiro: string
  bytes: number
  texto: string
}

interface ScriptViewerDialogProps {
  dados: Visualizacao
  onCopiarComando: (s: Script) => void
  onFechar: () => void
}

/**
 * Mostra o conteúdo de um script só para leitura.
 * O texto vive apenas enquanto a janela está aberta — não é guardado.
 */
export default function ScriptViewerDialog({ dados, onCopiarComando, onFechar }: ScriptViewerDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const { total, numeros } = useMemo(() => numerarLinhas(dados.texto), [dados.texto])
  const esperado = nomeFicheiro(dados.script.caminho)
  const diferente = esperado.toLowerCase() !== dados.ficheiro.toLowerCase()

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog dialog-viewer"
      aria-labelledby={`${uid}-t`}
      onCancel={(e) => {
        e.preventDefault()
        onFechar()
      }}
    >
      <div className="dialog-body">
        <div className="panel-head">
          <h2 id={`${uid}-t`} className="section-title">
            <Icon name="eye" size={18} /> {dados.script.nome}
          </h2>
          <button type="button" className="icon-btn sm" onClick={onFechar} aria-label="Fechar visualizador">
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="muted viewer-meta">
          <Icon name="lock" size={14} /> Só leitura · {dados.ficheiro} · {total} linhas · {(dados.bytes / 1024).toFixed(1)} KB · o conteúdo não é
          guardado
        </p>
        {diferente && (
          <p className="notice erro" role="alert">
            Atenção: escolheste «{dados.ficheiro}», mas o script registado é «{esperado}».
          </p>
        )}
        <div className="code-view" tabIndex={0} aria-label={`Conteúdo de ${dados.ficheiro}`}>
          <pre className="code-nums" aria-hidden="true">
            {numeros}
          </pre>
          <pre className="code-text">{dados.texto}</pre>
        </div>
        <div className="btn-row end">
          <button type="button" className="btn" onClick={() => onCopiarComando(dados.script)}>
            <Icon name="terminal" size={16} /> Copiar comando
          </button>
          <button type="button" className="btn btn-primary" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  )
}
