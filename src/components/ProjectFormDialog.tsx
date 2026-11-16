import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from './Icon'
import { AREAS } from '../data'
import type { AreaId, Estado, Projeto } from '../data'
import { construirProjeto } from '../store/projetos'

const ESTADOS: Estado[] = ['Planeado', 'Em curso', 'Concluído']

interface ProjectFormDialogProps {
  /** null = criar novo projeto. */
  projeto: Projeto | null
  areaInicial?: AreaId
  novoId: number
  onGuardar: (projeto: Projeto) => void
  onCancelar: () => void
}

/** Formulário de criação/edição. É montado ao abrir e desmontado ao fechar. */
export default function ProjectFormDialog({ projeto, areaInicial, novoId, onGuardar, onCancelar }: ProjectFormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()

  const [nome, setNome] = useState(projeto?.nome ?? '')
  const [area, setArea] = useState<AreaId>(projeto?.area ?? areaInicial ?? 'dev')
  const [estado, setEstado] = useState<Estado>(projeto?.estado ?? 'Planeado')
  const [progresso, setProgresso] = useState(projeto?.progresso ?? 0)
  const [pasta, setPasta] = useState(projeto?.pasta ?? '')
  const [tecnologias, setTecnologias] = useState(projeto?.tecnologias?.join(', ') ?? '')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  // Qualquer alteração limpa a mensagem de erro anterior.
  const alterar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      setErro(null)
      set(v)
    }

  const mudarEstado = (novo: Estado) => {
    setErro(null)
    setEstado(novo)
    if (novo === 'Concluído') setProgresso(100)
  }

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    const r = construirProjeto({ nome, area, estado, progresso, pasta, tecnologias }, projeto?.id ?? novoId)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    onGuardar(r.projeto)
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog-lg"
      aria-labelledby={`${uid}-titulo`}
      onCancel={(e) => {
        e.preventDefault()
        onCancelar()
      }}
    >
      <form className="dialog-body form" onSubmit={submeter} noValidate>
        <h2 id={`${uid}-titulo`} className="section-title">
          <Icon name={projeto ? 'edit' : 'plus'} size={18} /> {projeto ? 'Editar projeto' : 'Novo projeto'}
        </h2>

        <label className="field">
          <span>Nome *</span>
          <input value={nome} onChange={(e) => alterar(setNome)(e.target.value)} maxLength={120} required autoFocus />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Área</span>
            <select value={area} onChange={(e) => alterar(setArea)(e.target.value as AreaId)}>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Estado</span>
            <select value={estado} onChange={(e) => mudarEstado(e.target.value as Estado)}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>
            Progresso: <strong>{progresso}%</strong>
          </span>
          <input type="range" min={0} max={100} value={progresso} onChange={(e) => alterar(setProgresso)(Number(e.target.value))} />
        </label>

        <label className="field">
          <span>Pasta no disco (opcional)</span>
          <input
            value={pasta}
            onChange={(e) => alterar(setPasta)(e.target.value)}
            maxLength={260}
            spellCheck={false}
            placeholder="C:\Users\…\Projetos\…"
          />
          <small>Apenas uma referência — a app nunca acede nem altera esta pasta.</small>
        </label>

        <label className="field">
          <span>Tecnologias (opcional)</span>
          <input value={tecnologias} onChange={(e) => alterar(setTecnologias)(e.target.value)} placeholder="React, TypeScript, Vite" />
          <small>Separadas por vírgulas.</small>
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
            {projeto ? 'Guardar alterações' : 'Criar projeto'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
