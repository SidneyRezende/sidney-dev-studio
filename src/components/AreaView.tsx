import type { CSSProperties, ReactNode } from 'react'
import Icon from './Icon'
import ProjectList from './ProjectList'
import type { AcoesProjeto } from './ProjectList'
import { areaPorId, resumo } from '../data'
import type { AreaId, Projeto } from '../data'
import { filtrarProjetos } from '../store/projetos'
import { contarTecnologias } from '../utils/tecnologias'

interface AreaViewProps {
  id: AreaId
  projetos: Projeto[]
  acoes: AcoesProjeto
  onNovo: (area: AreaId) => void
  onBack: () => void
  /** Só na área Desenvolvimento: importar projetos de uma pasta escolhida. */
  onImportarPasta?: () => void
  aAnalisar?: boolean
  /** Conteúdo específico da área (ex.: quadro do YouTube), mostrado antes dos projetos. */
  extra?: ReactNode
}

export default function AreaView({ id, projetos, acoes, onNovo, onBack, onImportarPasta, aAnalisar = false, extra }: AreaViewProps) {
  const area = areaPorId(id)
  const lista = filtrarProjetos(
    projetos.filter((p) => p.area === id),
    'todos',
  )
  const r = resumo(lista)
  const ehDev = id === 'dev'
  const tecnologias = ehDev ? contarTecnologias(lista.map((p) => p.tecnologias)) : []

  return (
    <div style={{ '--c': area.cor } as CSSProperties}>
      <button type="button" className="link-btn back" onClick={onBack}>
        <Icon name="back" size={16} /> Voltar ao dashboard
      </button>

      <section className="card area-hero fade-in">
        <span className="area-icon big">
          <Icon name={area.icon} size={28} />
        </span>
        <div>
          <h2>{area.nome}</h2>
          <p>{area.descricao}</p>
          <ul className="chips" aria-label="Ferramentas">
            {area.ferramentas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <dl className="mini-stats">
          <div>
            <dt>Projetos</dt>
            <dd>{r.total}</dd>
          </div>
          <div>
            <dt>Em curso</dt>
            <dd>{r.emCurso}</dd>
          </div>
          <div>
            <dt>Progresso</dt>
            <dd>{r.media}%</dd>
          </div>
        </dl>
      </section>

      {ehDev && (
        <section className="card panel tech-panel fade-in" aria-labelledby="tech-title">
          <h2 id="tech-title" className="section-title">
            <Icon name="code" size={18} /> Tecnologias utilizadas
          </h2>
          {tecnologias.length === 0 ? (
            <p className="muted">Ainda nenhum projeto tem tecnologias registadas. Edita um projeto ou importa da pasta.</p>
          ) : (
            <ul className="chips">
              {tecnologias.map((t) => (
                <li key={t.nome}>
                  {t.nome} <span className="tab-count">{t.total}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {extra}

      <section className="card panel" aria-labelledby="area-projects">
        <div className="panel-head">
          <h2 id="area-projects" className="section-title">Projetos</h2>
          <div className="btn-row">
            {onImportarPasta && (
              <button type="button" className="btn" onClick={onImportarPasta} disabled={aAnalisar}>
                <Icon name="folder" size={16} /> {aAnalisar ? 'A ler pasta…' : 'Importar da pasta'}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => onNovo(id)}>
              <Icon name="plus" size={16} /> Novo projeto
            </button>
          </div>
        </div>
        <ProjectList projetos={lista} mostrarArea={false} detalhes={ehDev} acoes={acoes} />
        {ehDev && (
          <p className="hint dev-hint">
            <Icon name="terminal" size={16} /> O botão <strong>Copiar comando VS Code</strong> copia <code>code "pasta"</code>. Cola-o
            num terminal (Ctrl+V) para abrir o projeto.
          </p>
        )}
      </section>
    </div>
  )
}
