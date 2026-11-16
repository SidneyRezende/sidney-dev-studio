import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../Icon'
import type { CategoriaPrompt, Prompt } from '../../data'
import { CATEGORIAS_PROMPT, LIMITES } from '../../store/schema'
import { construirPrompt, extrairVariaveis } from '../../store/ia'
import type { CamposPrompt } from '../../store/ia'

interface Props {
  prompt: Prompt | null
  novoId: number
  onGuardar: (p: Prompt) => void
  onCancelar: () => void
}

export default function PromptFormDialog({ prompt, novoId, onGuardar, onCancelar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [c, setC] = useState<CamposPrompt>(() =>
    prompt ? { titulo: prompt.titulo, categoria: prompt.categoria, texto: prompt.texto } : { titulo: '', categoria: 'YouTube', texto: '' },
  )
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const alterar = <K extends keyof CamposPrompt>(campo: K, valor: CamposPrompt[K]) => {
    setErro(null)
    setC((a) => ({ ...a, [campo]: valor }))
  }

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    const r = construirPrompt(c, prompt?.id ?? novoId)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    onGuardar(r.valor)
  }

  const variaveis = extrairVariaveis(c.texto)

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
          <Icon name={prompt ? 'edit' : 'plus'} size={18} /> {prompt ? 'Editar prompt' : 'Novo prompt'}
        </h2>

        <div className="field-row">
          <label className="field">
            <span>Título *</span>
            <input value={c.titulo} onChange={(e) => alterar('titulo', e.target.value)} maxLength={LIMITES.tituloPrompt} autoFocus />
          </label>
          <label className="field">
            <span>Categoria</span>
            <select value={c.categoria} onChange={(e) => alterar('categoria', e.target.value as CategoriaPrompt)}>
              {CATEGORIAS_PROMPT.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">
            Texto do prompt *
            <span className="contador">
              {c.texto.length}/{LIMITES.textoPrompt}
            </span>
          </span>
          <textarea
            className="roteiro"
            value={c.texto}
            onChange={(e) => alterar('texto', e.target.value)}
            maxLength={LIMITES.textoPrompt}
            rows={9}
            placeholder={'Sugere 10 títulos para um vídeo sobre {tema}.'}
          />
          <small>
            Usa <code>{'{nome}'}</code> para campos variáveis. Com um vídeo selecionado, <code>{'{titulo}'}</code>, <code>{'{tema}'}</code>,{' '}
            <code>{'{descricao}'}</code>, <code>{'{roteiro}'}</code> e <code>{'{etiquetas}'}</code> são preenchidos automaticamente.
          </small>
        </label>

        {variaveis.length > 0 && (
          <p className="chips-sm" aria-label="Variáveis detetadas">
            {variaveis.map((v) => (
              <span key={v} className="chip-sm">
                {`{${v}}`}
              </span>
            ))}
          </p>
        )}

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
            {prompt ? 'Guardar alterações' : 'Criar prompt'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
