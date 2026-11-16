import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Icon from './Icon'
import ConfirmDialog from './ConfirmDialog'
import { criarExemplos } from '../data'
import type { AppData } from '../data'
import { BACKUP_MAX_BYTES, criarBackup, lerBackup } from '../store/schema'
import type { EstadoArmazenamento } from '../store/usePersistentState'
import { dataCurta } from '../utils/datas'

interface DataPanelProps {
  dados: AppData
  estado: EstadoArmazenamento
  onSubstituir: (dados: AppData) => void
}

type Pendente = { tipo: 'importar'; dados: AppData; ficheiro: string } | { tipo: 'repor' } | null

const ESTADO_TEXTO: Record<EstadoArmazenamento, string> = {
  guardado: 'Guardado neste navegador',
  indisponivel: 'Armazenamento indisponível — alterações só ficam até fechar a página',
  erro: 'Não foi possível guardar (espaço cheio?) — exporta um backup',
}

function resumoDados(d: AppData): string {
  return `${d.projetos.length} projetos, ${d.videos.length} vídeos, ${d.ideias.length} ideias, ${d.scripts.length} scripts, ${d.prompts.length} prompts`
}

export default function DataPanel({ dados, estado, onSubstituir }: DataPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendente, setPendente] = useState<Pendente>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const tamanhoKB = useMemo(() => (new Blob([JSON.stringify(dados)]).size / 1024).toFixed(1), [dados])

  const exportar = () => {
    const blob = new Blob([criarBackup(dados)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sidney-dev-studio-backup-${dataCurta()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setAviso({ tipo: 'ok', texto: `Backup exportado: ${resumoDados(dados)}.` })
  }

  const aoEscolherFicheiro = async (e: ChangeEvent<HTMLInputElement>) => {
    const ficheiro = e.target.files?.[0]
    e.target.value = ''
    if (!ficheiro) return
    if (ficheiro.size > BACKUP_MAX_BYTES) {
      setAviso({ tipo: 'erro', texto: 'Ficheiro demasiado grande (máximo 1 MB).' })
      return
    }
    const lidos = lerBackup(await ficheiro.text())
    if (!lidos) {
      setAviso({ tipo: 'erro', texto: `"${ficheiro.name}" não é um backup válido do Sidney Dev Studio.` })
      return
    }
    setAviso(null)
    setPendente({ tipo: 'importar', dados: lidos, ficheiro: ficheiro.name })
  }

  const confirmar = () => {
    if (pendente?.tipo === 'importar') {
      onSubstituir(pendente.dados)
      setAviso({ tipo: 'ok', texto: `Backup importado: ${resumoDados(pendente.dados)}.` })
    } else if (pendente?.tipo === 'repor') {
      // Repõe só os projetos; vídeos e ideias ficam intactos.
      onSubstituir({ ...dados, projetos: criarExemplos() })
      setAviso({ tipo: 'ok', texto: 'Projetos de exemplo repostos.' })
    }
    setPendente(null)
  }

  return (
    <section className="card panel" aria-labelledby="data-title">
      <h2 id="data-title" className="section-title">
        <Icon name="database" size={18} /> Dados locais
      </h2>

      <p className="data-status">
        <span className={estado === 'guardado' ? 'ok-dot' : 'warn-dot'} aria-hidden="true" />
        {ESTADO_TEXTO[estado]}
      </p>
      <p className="data-meta">
        {dados.projetos.length} projetos · {dados.videos.length} vídeos · {dados.ideias.length} ideias · {dados.scripts.length} scripts · {dados.prompts.length} prompts ·{' '}
        {tamanhoKB} KB
      </p>

      <div className="btn-row">
        <button type="button" className="btn" onClick={exportar}>
          <Icon name="download" size={16} /> Exportar
        </button>
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={16} /> Importar
        </button>
        <button type="button" className="btn" onClick={() => setPendente({ tipo: 'repor' })}>
          <Icon name="refresh" size={16} /> Repor exemplos
        </button>
      </div>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={aoEscolherFicheiro} />

      {aviso && (
        <p className={`notice ${aviso.tipo}`} role="status">
          {aviso.texto}
        </p>
      )}

      <ConfirmDialog
        aberto={pendente !== null}
        titulo={pendente?.tipo === 'importar' ? 'Importar backup?' : 'Repor projetos de exemplo?'}
        textoConfirmar={pendente?.tipo === 'importar' ? 'Importar' : 'Repor'}
        perigo
        onConfirmar={confirmar}
        onCancelar={() => setPendente(null)}
      >
        {pendente?.tipo === 'importar' ? (
          <p>
            Os dados atuais (<strong>{resumoDados(dados)}</strong>) vão ser substituídos pelos de <code>{pendente.ficheiro}</code> (
            <strong>{resumoDados(pendente.dados)}</strong>).
          </p>
        ) : (
          <p>
            Os <strong>{dados.projetos.length} projetos atuais</strong> vão ser substituídos pelos 8 projetos de exemplo. Os vídeos, as
            ideias, os scripts e a área de IA não são alterados.
          </p>
        )}
        <p className="muted">Recomendação: exporta primeiro um backup. Nenhum ficheiro ou pasta do disco é alterado.</p>
      </ConfirmDialog>
    </section>
  )
}
