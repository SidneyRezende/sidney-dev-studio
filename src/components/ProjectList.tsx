import type { CSSProperties } from 'react'
import Icon from './Icon'
import { areaPorId } from '../data'
import type { Estado, Projeto } from '../data'
import { tempoRelativo } from '../utils/datas'

const BADGE: Record<Estado, string> = {
  'Em curso': 'badge badge-curso',
  Concluído: 'badge badge-ok',
  Planeado: 'badge badge-plan',
}

export interface AcoesProjeto {
  editar: (p: Projeto) => void
  eliminar: (p: Projeto) => void
  /** Copia `code "<pasta>"` (só aparece em projetos com pasta). */
  copiarComando?: (p: Projeto) => void
}

interface ProjectListProps {
  projetos: Projeto[]
  mostrarArea?: boolean
  /** Mostra tecnologias e caminho da pasta por baixo do nome. */
  detalhes?: boolean
  acoes?: AcoesProjeto
  vazio?: string
}

export default function ProjectList({
  projetos,
  mostrarArea = true,
  detalhes = false,
  acoes,
  vazio = 'Ainda não há projetos nesta área.',
}: ProjectListProps) {
  if (projetos.length === 0) {
    return <p className="empty">{vazio}</p>
  }

  return (
    <ul className={`projects${acoes ? ' com-acoes' : ''}`}>
      {projetos.map((p, i) => {
        const area = areaPorId(p.area)
        const temDetalhes = detalhes && (Boolean(p.tecnologias?.length) || Boolean(p.pasta))
        return (
          <li key={p.id} className="project fade-in" style={{ '--c': area.cor, '--i': i } as CSSProperties}>
            <div className="project-main">
              <span className="dot" aria-hidden="true" />
              <div>
                <strong title={p.nome}>{p.nome}</strong>
                {mostrarArea && <span className="project-area">{area.nome}</span>}
                {temDetalhes && (
                  <div className="project-meta">
                    {p.tecnologias && p.tecnologias.length > 0 && (
                      <span className="chips-sm">
                        {p.tecnologias.map((t) => (
                          <span key={t} className="chip-sm">
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                    {p.pasta && (
                      <code className="project-path" title={p.pasta}>
                        {p.pasta}
                      </code>
                    )}
                  </div>
                )}
              </div>
            </div>
            <span className={BADGE[p.estado]}>{p.estado}</span>
            <div className="project-progress">
              <div className="bar" role="progressbar" aria-valuenow={p.progresso} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${p.nome}`}>
                <span style={{ width: `${p.progresso}%` }} />
              </div>
              <span className="pct">{p.progresso}%</span>
            </div>
            <time className="project-date" dateTime={p.atualizado} title={new Date(p.atualizado).toLocaleString('pt-PT')}>
              {tempoRelativo(p.atualizado)}
            </time>
            {acoes && (
              <div className="project-actions">
                {acoes.copiarComando && p.pasta && (
                  <button
                    type="button"
                    className="icon-btn sm"
                    onClick={() => acoes.copiarComando?.(p)}
                    aria-label={`Copiar comando VS Code de ${p.nome}`}
                    title="Copiar comando VS Code"
                  >
                    <Icon name="terminal" size={16} />
                  </button>
                )}
                <button type="button" className="icon-btn sm" onClick={() => acoes.editar(p)} aria-label={`Editar ${p.nome}`} title="Editar">
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" className="icon-btn sm danger" onClick={() => acoes.eliminar(p)} aria-label={`Eliminar ${p.nome}`} title="Eliminar">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
