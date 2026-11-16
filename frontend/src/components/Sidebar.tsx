import { NavLink } from 'react-router-dom';
import {
  Database, ArrowUpRight, BookOpen, Flame, GitCompareArrows, LayoutDashboard, Search, ShieldCheck, X, BrainCircuit, SatelliteDish, Atom, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const navigation: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Mission Overview', icon: LayoutDashboard, end: true },
  { to: '/mission', label: 'Guided Research Mission', icon: Sparkles },
  { to: '/laboratory', label: 'Microgravity Laboratory', icon: Atom },
  { to: '/experiments', label: 'Experiment Explorer', icon: Database },
  { to: '/compare', label: 'Comparison Lab', icon: GitCompareArrows },
];
const toolsNavigation: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/research', label: 'Research Intelligence', icon: Search },
  { to: '/insights', label: 'Scientific Insights', icon: BrainCircuit },
  { to: '/sync', label: 'Live NASA Research Sync', icon: SatelliteDish },
  { to: '/sources', label: 'NASA Source Library', icon: BookOpen },
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
      <details className="ignite-nav-disclosure"><summary>MORE RESEARCH TOOLS</summary>
      <nav className="nav-list ignite-nav-tools">
        {toolsNavigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></NavLink>)}
      </nav></details>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <span className="sidebar-footer-icon"><ShieldCheck size={20}/></span>
        <div><strong>Evidence before inference</strong><p>Curated NASA PSI records.</p></div>
      </div>
      <a className="sidebar-external" href="https://psi.nasa.gov/physci/repo/search?q=combustion" target="_blank" rel="noreferrer">
        NASA PSI Repository <ArrowUpRight size={15}/>
      </a>
    </aside>
  </>;
}
