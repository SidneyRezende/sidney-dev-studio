import Icon from './Icon'
import type { IconName } from './Icon'
import { AREAS } from '../data'
import type { View } from '../data'

interface SidebarProps {
  view: View
  open: boolean
  onNavigate: (view: View) => void
  onClose: () => void
}

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  ...AREAS.map((a) => ({ id: a.id, label: a.nome, icon: a.icon })),
]

export default function Sidebar({ view, open, onNavigate, onClose }: SidebarProps) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Menu principal">
      <div className="brand">
        <span className="brand-logo" aria-hidden="true">S</span>
        <span className="brand-name">
          SIDNEY
          <small>DEV STUDIO</small>
        </span>
        <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Fechar menu">
          <Icon name="close" />
        </button>
      </div>

      <nav className="nav">
        <span className="nav-title">Navegação</span>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item${view === item.id ? ' active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <Icon name="cpu" size={18} />
        <div>
          <strong>Modo leve</strong>
          <span>Otimizado para 4 GB RAM</span>
        </div>
      </div>
    </aside>
  )
}
