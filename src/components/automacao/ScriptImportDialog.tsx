import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../Icon'
import type { Script } from '../../data'
import { construirScript } from '../../store/scripts'
import { juntarCaminho, mesmoCaminho, sugerirBaseScripts } from '../../utils/caminhos'
import type { ResultadoScripts } from '../../utils/pastas'

interface ScriptImportDialogProps {
  resultado: ResultadoScripts
  existentes: Script[]
  /** Pasta "…\Projetos" deduzida dos caminhos já registados (null = desconhecida). */
  pastaProjetos: string | null
  primeiroId: number
  onImportar: (novos: Script[]) => void
  onCancelar: () => void
}

/** Pré-visualização da importação de scripts: nada é adicionado sem confirmação. */
export default function ScriptImportDialog({ resultado, existentes, pastaProjetos, primeiroId, onImportar, onCancelar }: ScriptImportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [base, setBase] = useState(() => sugerirBaseScripts(resultado.raiz, pastaProjetos))
  const [desmarcados, setDesmarcados] = useState<Set<string>>(() => new Set())
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const linhas = resultado.scripts.map((s) => {
    const caminho = juntarCaminho(base, s.relativo)
    const registado = existentes.some((e) => mesmoCaminho(e.caminho, caminho))
    return { ...s, caminho, registado, marcado: !registado && !desmarcados.has(s.relativo) }
  })
  const aImportar = linhas.filter((l) => l.marcado)

  const alternar = (relativo: string) => {
    setErro(null)
    setDesmarcados((atual) => {
      const novo = new Set(atual)
      if (novo.has(relativo)) novo.delete(relativo)
      else novo.add(relativo)
      return novo
    })
  }

  const importar = () => {
    if (!base.trim()) {
      setErro('Indica o caminho completo da pasta escolhida.')
      return
    }
    const novos: Script[] = []
    let id = primeiroId
    for (const l of aImportar) {
      const r = construirScript({ nome: l.nome, linguagem: l.linguagem, caminho: l.caminho, descricao: l.descricao, argumentos: '' }, id)
      if (!r.ok) {
        setErro(`"${l.nome}": ${r.erro}`)
        return
      }
      novos.push(r.valor)
      id++
    }
    onImportar(novos)
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
      <div className="dialog-body form">
        <h2 id={`${uid}-t`} className="section-title">
          <Icon name="folder" size={18} /> Importar scripts de «{resultado.raiz}»
        </h2>
        <p className="muted">
          A app procurou ficheiros <code>.py</code> e <code>.ps1</code> (até 2 subpastas) e leu só o início de cada um para a descrição. Nada foi
          executado nem alterado.
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
          <p className="empty">Não foram encontrados scripts .py ou .ps1 nesta pasta.</p>
        ) : (
          <ul className="import-list">
            {linhas.map((l) => (
              <li key={l.relativo} className={l.registado ? 'is-off' : undefined}>
                <label>
                  <input type="checkbox" checked={l.marcado} disabled={l.registado} onChange={() => alternar(l.relativo)} />
                  <span className="import-info">
                    <strong>
                      <span className={`lang lang-sm lang-${l.linguagem === 'Python' ? 'py' : 'ps'}`}>{l.linguagem === 'Python' ? 'PY' : 'PS'}</span>{' '}
                      {l.nome}
                    </strong>
                    <code className="project-path">{l.caminho}</code>
                    <span className="muted">{l.descricao || 'Sem descrição no início do ficheiro'}</span>
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
            Importar {aImportar.length} {aImportar.length === 1 ? 'script' : 'scripts'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
