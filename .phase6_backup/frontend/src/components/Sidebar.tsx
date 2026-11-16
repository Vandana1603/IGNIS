import { NavLink } from 'react-router-dom';
import {
  Database,ArrowUpRight, BarChart3, BookOpen, Flame,
  GitCompareArrows, LayoutDashboard, Microscope, Search, ShieldCheck, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const navigation: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Mission Overview', icon: LayoutDashboard, end: true },
  { to: '/research', label: 'Research Intelligence', icon: Search },
  { to: '/experiments', label: 'Experiment Explorer', icon: Database },
  { to: '/compare', label: 'Comparison Lab', icon: GitCompareArrows },
  { to: '/methodology', label: 'Methodology', icon: ShieldCheck },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <>
    {open && <button type="button" className="mobile-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-top">
        <NavLink to="/" className="brand" onClick={onClose}>
          <span className="brand-symbol"><Flame size={26} strokeWidth={1.7} /></span>
          <span className="brand-type"><strong>IGNIS</strong><small>MICROGRAVITY INTELLIGENCE</small></span>
        </NavLink>
        <button type="button" className="icon-button mobile-close" aria-label="Close navigation" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="sidebar-divider" />
      <div className="nav-caption">MISSION CONTROL</div>
      <nav className="nav-list">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onClose}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
            <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-divider" />
      <div className="nav-caption">RESEARCH PRINCIPLES</div>
      <div className="sidebar-principle"><Microscope size={17}/><span>Original NASA fields</span></div>
      <div className="sidebar-principle"><BarChart3 size={17}/><span>Traceable measurements</span></div>
      <div className="sidebar-principle"><BookOpen size={17}/><span>Explainable retrieval</span></div>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <span className="sidebar-footer-icon"><ShieldCheck size={20}/></span>
        <div><strong>Research-grade transparency</strong><p>Evidence before interpretation.</p></div>
      </div>
      <a className="sidebar-external" href="https://psi.nasa.gov/physci/repo/search?q=combustion" target="_blank" rel="noreferrer">
        NASA PSI Repository <ArrowUpRight size={15}/>
      </a>
    </aside>
  </>;
}
