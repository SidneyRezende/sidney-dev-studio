import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon'
import type { Projeto } from '../data'
import { construirProjeto } from '../store/projetos'
import { juntarCaminho, mesmoCaminho, sugerirBase } from '../utils/caminhos'
import type { ResultadoAnalise } from '../utils/pastas'

interface ImportDialogProps {
  resultado: ResultadoAnalise
  existentes: Projeto[]
  /** Pasta "…\Projetos" deduzida dos caminhos já registados (null = desconhecida). */
  pastaProjetos: string | null
  primeiroId: number
  onImportar: (novos: Projeto[]) => void
  onCancelar: () => void
}

/** Pré-visualização da importação: nada é adicionado sem confirmação. */
export default function ImportDialog({ resultado, existentes, pastaProjetos, primeiroId, onImportar, onCancelar }: ImportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [base, setBase] = useState(() => sugerirBase(resultado.raiz, pastaProjetos))
  const [selecionados, setSelecionados] = useState<Set<string>>(() => {
    const inicial = sugerirBase(resultado.raiz, pastaProjetos)
    const livres = resultado.projetos.filter(
      (p) => !existentes.some((e) => mesmoCaminho(e.pasta, juntarCaminho(inicial, p.subpasta))),
    )
    return new Set(livres.map((p) => p.subpasta))
  })
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const linhas = resultado.projetos.map((p) => {
    const caminho = juntarCaminho(base, p.subpasta)
    const registado = existentes.some((e) => mesmoCaminho(e.pasta, caminho))
    return { ...p, caminho, registado, marcado: !registado && selecionados.has(p.subpasta) }
  })
  const aImportar = linhas.filter((l) => l.marcado)

  const alternar = (subpasta: string) => {
    setErro(null)
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(subpasta)) novo.delete(subpasta)
      else novo.add(subpasta)
      return novo
    })
  }

  const importar = () => {
    if (!base.trim()) {
      setErro('Indica o caminho completo da pasta escolhida.')
      return
    }
    const novos: Projeto[] = []
    let id = primeiroId
    for (const l of aImportar) {
      const r = construirProjeto(
        { nome: l.nome, area: 'dev', estado: 'Em curso', progresso: 0, pasta: l.caminho, tecnologias: l.tecnologias.join(', ') },
        id,
      )
      if (!r.ok) {
        setErro(`"${l.nome}": ${r.erro}`)
        return
      }
      novos.push(r.projeto)
      id++
    }
    onImportar(novos)
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
      <div className="dialog-body form">
        <h2 id={`${uid}-titulo`} className="section-title">
          <Icon name="folder" size={18} /> Importar de «{resultado.raiz}»
        </h2>
        <p className="muted">
          A app leu apenas os nomes das subpastas e os ficheiros <code>package.json</code>. Nada foi alterado no disco.
        </p>

        <label className="field">
          <span>Caminho completo da pasta escolhida</span>
          <input
            value={base}
            onChange={(e) => {
              setErro(null)
              setBase(e.target.value)
            }}
            maxLength={200}
            spellCheck={false}
          />
          <small>Por segurança, o navegador não revela o caminho completo. Confirma ou corrige esta sugestão.</small>
        </label>

        {linhas.length === 0 ? (
          <p className="empty">Não foram encontradas subpastas de projetos.</p>
        ) : (
          <ul className="import-list">
            {linhas.map((l) => (
              <li key={l.subpasta || l.nome} className={l.registado ? 'is-off' : undefined}>
                <label>
                  <input type="checkbox" checked={l.marcado} disabled={l.registado} onChange={() => alternar(l.subpasta)} />
                  <span className="import-info">
                    <strong>{l.nome}</strong>
                    <code className="project-path">{l.caminho}</code>
                    <span className="chips-sm">
                      {l.tecnologias.length ? (
                        l.tecnologias.map((t) => (
                          <span key={t} className="chip-sm">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="muted">Sem tecnologias detetadas</span>
                      )}
                    </span>
                  </span>
                  {l.registado && <span className="badge badge-plan">Já registado</span>}
                </label>
              </li>
            ))}
          </ul>
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
          <button type="button" className="btn btn-primary" onClick={importar} disabled={aImportar.length === 0}>
            Importar {aImportar.length} {aImportar.length === 1 ? 'projeto' : 'projetos'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
