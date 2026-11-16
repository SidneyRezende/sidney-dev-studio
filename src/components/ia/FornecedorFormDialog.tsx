import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../Icon'
import type { Fornecedor } from '../../data'
import { LIMITES } from '../../store/schema'
import { construirFornecedor } from '../../store/ia'
import type { CamposFornecedor } from '../../store/ia'

interface Props {
  fornecedor: Fornecedor | null
  novoId: number
  onGuardar: (f: Fornecedor) => void
  onCancelar: () => void
}

/** Configuração de um fornecedor de IA. Propositadamente SEM campo para chave API. */
export default function FornecedorFormDialog({ fornecedor, novoId, onGuardar, onCancelar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [c, setC] = useState<CamposFornecedor>(() =>
    fornecedor
      ? { nome: fornecedor.nome, modelo: fornecedor.modelo, endpoint: fornecedor.endpoint, notas: fornecedor.notas }
      : { nome: '', modelo: '', endpoint: 'https://', notas: '' },
  )
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const alterar = (campo: keyof CamposFornecedor, valor: string) => {
    setErro(null)
    setC((a) => ({ ...a, [campo]: valor }))
  }

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    const r = construirFornecedor(c, fornecedor?.id ?? novoId)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    onGuardar(r.valor)
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog-lg"
      aria-labelledby={`${uid}-t`}
      onCancel={(e) => {
        e.preventDefault()
        onCancelar()
      }}
    >
      <form className="dialog-body form" onSubmit={submeter} noValidate autoComplete="off">
        <h2 id={`${uid}-t`} className="section-title">
          <Icon name={fornecedor ? 'edit' : 'plus'} size={18} /> {fornecedor ? 'Editar fornecedor' : 'Novo fornecedor de IA'}
        </h2>

        <div className="field-row">
          <label className="field">
            <span>Nome *</span>
            <input value={c.nome} onChange={(e) => alterar('nome', e.target.value)} maxLength={LIMITES.nomeFornecedor} autoFocus />
          </label>
          <label className="field">
            <span>Modelo *</span>
            <input value={c.modelo} onChange={(e) => alterar('modelo', e.target.value)} maxLength={LIMITES.modelo} spellCheck={false} />
          </label>
        </div>

        <label className="field">
          <span>Endpoint *</span>
          <input value={c.endpoint} onChange={(e) => alterar('endpoint', e.target.value)} maxLength={LIMITES.endpoint} spellCheck={false} />
          <small>https:// (ou http://localhost para um servidor local). Sem chaves nem tokens no URL.</small>
        </label>

        <label className="field">
          <span>Notas (opcional)</span>
          <textarea value={c.notas} onChange={(e) => alterar('notas', e.target.value)} maxLength={LIMITES.notas} rows={2} />
        </label>

        <p className="notice key-notice">
          <Icon name="lock" size={14} /> Não existe campo para a chave API. As chaves ficam no ficheiro <code>.env</code> de um servidor
          local — nunca nesta app nem no navegador.
        </p>

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
            {fornecedor ? 'Guardar alterações' : 'Adicionar fornecedor'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
