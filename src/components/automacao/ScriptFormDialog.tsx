import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../Icon'
import type { LinguagemScript, Script } from '../../data'
import { LIMITES, LINGUAGENS } from '../../store/schema'
import { comandoScript, construirScript, linguagemPorExtensao, nomeFicheiro } from '../../store/scripts'
import type { CamposScript } from '../../store/scripts'

interface ScriptFormDialogProps {
  /** null = novo script. */
  script: Script | null
  novoId: number
  onGuardar: (s: Script) => void
  onCancelar: () => void
}

const VAZIO: CamposScript = { nome: '', linguagem: 'Python', caminho: '', descricao: '', argumentos: '' }

export default function ScriptFormDialog({ script, novoId, onGuardar, onCancelar }: ScriptFormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [c, setC] = useState<CamposScript>(() =>
    script
      ? { nome: script.nome, linguagem: script.linguagem, caminho: script.caminho, descricao: script.descricao, argumentos: script.argumentos }
      : VAZIO,
  )
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const alterar = <K extends keyof CamposScript>(campo: K, valor: CamposScript[K]) => {
    setErro(null)
    setC((atual) => ({ ...atual, [campo]: valor }))
  }

  // Ao escrever o caminho: deteta a linguagem pela extensão.
  const alterarCaminho = (caminho: string) => {
    setErro(null)
    setC((atual) => ({ ...atual, caminho, linguagem: linguagemPorExtensao(caminho) ?? atual.linguagem }))
  }

  // Ao sair do campo caminho: se o nome estiver vazio, usa o nome do ficheiro.
  const preencherNome = () => {
    if (!c.nome.trim() && c.caminho.trim()) alterar('nome', nomeFicheiro(c.caminho))
  }

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    const r = construirScript(c, script?.id ?? novoId)
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
      <form className="dialog-body form" onSubmit={submeter} noValidate>
        <h2 id={`${uid}-t`} className="section-title">
          <Icon name={script ? 'edit' : 'plus'} size={18} /> {script ? 'Editar script' : 'Novo script'}
        </h2>

        <label className="field">
          <span>Caminho do ficheiro *</span>
          <input
            value={c.caminho}
            onChange={(e) => alterarCaminho(e.target.value)}
            onBlur={preencherNome}
            maxLength={LIMITES.caminho}
            spellCheck={false}
            placeholder="C:\Users\…\Projetos\Automacao\script.py"
            autoFocus
          />
          <small>Apenas uma referência — a app nunca abre, executa nem altera este ficheiro sem a tua ação.</small>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Nome *</span>
            <input value={c.nome} onChange={(e) => alterar('nome', e.target.value)} maxLength={LIMITES.nomeScript} />
          </label>
          <label className="field">
            <span>Linguagem</span>
            <select value={c.linguagem} onChange={(e) => alterar('linguagem', e.target.value as LinguagemScript)}>
              {LINGUAGENS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Argumentos (opcional)</span>
          <input
            value={c.argumentos}
            onChange={(e) => alterar('argumentos', e.target.value)}
            maxLength={LIMITES.argumentos}
            spellCheck={false}
            placeholder="--simular"
          />
        </label>

        <label className="field">
          <span>Descrição (opcional)</span>
          <textarea value={c.descricao} onChange={(e) => alterar('descricao', e.target.value)} maxLength={LIMITES.descricaoScript} rows={3} />
        </label>

        <div className="cmd-preview">
          <span>Comando que será copiado</span>
          <code>{comandoScript({ ...c, caminho: c.caminho.trim() || '…' })}</code>
        </div>

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
            {script ? 'Guardar alterações' : 'Adicionar script'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
