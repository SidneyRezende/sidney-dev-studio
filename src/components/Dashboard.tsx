import { useState } from 'react'
import type { CSSProperties } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'
import ProjectList from './ProjectList'
import type { AcoesProjeto } from './ProjectList'
import DataPanel from './DataPanel'
import { AREAS, FERRAMENTAS, resumo } from '../data'
import type { AppData, AreaId } from '../data'
import type { EstadoArmazenamento } from '../store/usePersistentState'
import { filtrarProjetos } from '../store/projetos'
import type { Filtro } from '../store/projetos'

interface DashboardProps {
  dados: AppData
  estado: EstadoArmazenamento
  acoes: AcoesProjeto
  onNovo: () => void
  onSubstituir: (dados: AppData) => void
  onOpenArea: (id: AreaId) => void
}

const VAZIO: Record<Filtro, string> = {
  recentes: 'Ainda não há projetos. Cria o primeiro!',
  ativos: 'Nenhum projeto em curso.',
  concluidos: 'Ainda nenhum projeto concluído.',
  todos: 'Ainda não há projetos. Cria o primeiro!',
}

export default function Dashboard({ dados, estado, acoes, onNovo, onSubstituir, onOpenArea }: DashboardProps) {
  const [filtro, setFiltro] = useState<Filtro>('recentes')
  const projetos = dados.projetos
  const r = resumo(projetos)
  const taxa = r.total ? Math.round((r.concluidos / r.total) * 100) : 0

  const stats: { label: string; valor: string | number; nota: string; icon: IconName }[] = [
    { label: 'Projetos totais', valor: r.total, nota: `${r.planeados} planeados`, icon: 'folder' },
    { label: 'Ativos', valor: r.emCurso, nota: 'em curso neste momento', icon: 'activity' },
    { label: 'Concluídos', valor: r.concluidos, nota: `${taxa}% do total`, icon: 'check' },
    { label: 'Progresso médio', valor: `${r.media}%`, nota: 'em todos os projetos', icon: 'trending' },
  ]

  const filtros: { id: Filtro; label: string; total?: number }[] = [
    { id: 'recentes', label: 'Recentes' },
    { id: 'ativos', label: 'Ativos', total: r.emCurso },
    { id: 'concluidos', label: 'Concluídos', total: r.concluidos },
    { id: 'todos', label: 'Todos', total: r.total },
  ]

  return (
    <>
      <section className="stats" aria-label="Indicadores">
        {stats.map((s, i) => (
          <article key={s.label} className="card stat fade-in" style={{ '--i': i } as CSSProperties}>
            <span className="stat-icon">
              <Icon name={s.icon} />
            </span>
            <div>
              <span className="stat-label">{s.label}</span>
              <strong className="stat-value">{s.valor}</strong>
              <span className="stat-note">{s.nota}</span>
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="areas-title">
        <h2 id="areas-title" className="section-title">Áreas de trabalho</h2>
        <div className="areas">
          {AREAS.map((a, i) => {
            const lista = projetos.filter((p) => p.area === a.id)
            const ra = resumo(lista)
            return (
              <article key={a.id} className="card area-card fade-in" style={{ '--c': a.cor, '--i': i + 4 } as CSSProperties}>
                <div className="area-head">
                  <span className="area-icon">
                    <Icon name={a.icon} size={22} />
                  </span>
                  <span className="area-count">{ra.total} projetos</span>
                </div>
                <h3>{a.nome}</h3>
                <p>{a.descricao}</p>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${ra.media}%` }} />
                </div>
                <div className="area-foot">
                  <span>
                    {ra.emCurso} em curso · {ra.media}%
                  </span>
                  <button type="button" className="link-btn" onClick={() => onOpenArea(a.id)}>
                    Abrir <Icon name="arrow" size={16} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="split">
        <section className="card panel" aria-labelledby="projects-title">
          <div className="panel-head">
            <h2 id="projects-title" className="section-title">Projetos</h2>
            <button type="button" className="btn btn-primary" onClick={onNovo}>
              <Icon name="plus" size={16} /> Novo projeto
            </button>
          </div>

          <div className="tabs" role="group" aria-label="Filtrar projetos">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`tab${filtro === f.id ? ' active' : ''}`}
                aria-pressed={filtro === f.id}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
                {f.total !== undefined && <span className="tab-count">{f.total}</span>}
              </button>
            ))}
          </div>

          <ProjectList key={filtro} projetos={filtrarProjetos(projetos, filtro)} acoes={acoes} vazio={VAZIO[filtro]} />
        </section>

        <div className="stack">
          <DataPanel dados={dados} estado={estado} onSubstituir={onSubstituir} />

          <section className="card panel" aria-labelledby="env-title">
            <h2 id="env-title" className="section-title">
              <Icon name="terminal" size={18} /> Ambiente local
            </h2>
            <ul className="tools">
              {FERRAMENTAS.map((f) => (
                <li key={f.nome}>
                  <span className="ok-dot" aria-hidden="true" />
                  <span>{f.nome}</span>
                  <code>{f.versao}</code>
                </li>
              ))}
            </ul>
            <p className="hint">Dica: fecha separadores do navegador que não usas enquanto o servidor de desenvolvimento está ativo.</p>
          </section>
        </div>
      </div>
    </>
  )
}
