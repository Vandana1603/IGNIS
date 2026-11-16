import { useState } from 'react';
import { Menu, RefreshCw, ShieldCheck } from 'lucide-react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { UiErrorBoundary } from './phase7/UiErrorBoundary';
import { useCatalog } from './context/CatalogContext';
import { Overview } from './pages/Overview';
import { Research } from './pages/Research';
import { ScientificInsights } from './phase6/ScientificInsights';
import { Explorer } from './pages/Explorer';
import { Comparison } from './pages/Comparison';
import { Passport } from './pages/Passport';
import { Methodology } from './pages/Methodology';

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { index, loading, error, reload } = useCatalog();
  const location = useLocation();
  const section = location.pathname.startsWith('/research') ? 'RESEARCH INTELLIGENCE'
    : location.pathname.startsWith('/experiments') ? 'EXPERIMENT EXPLORER'
    : location.pathname.startsWith('/compare') ? 'COMPARISON LAB'
    : location.pathname.startsWith('/passport') ? 'EVIDENCE PASSPORT'
    : location.pathname.startsWith('/methodology') ? 'METHODOLOGY' : 'MISSION OVERVIEW';

  return <div className="app-shell">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)}/>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-left">
          <button type="button" className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21}/></button>
          <span className="topbar-kicker">IGNIS / <strong>{section}</strong></span>
        </div>
        <div className="topbar-right">
          <span className={`connection ${error ? 'connection-error' : loading ? 'connection-loading' : 'connection-ok'}`}>
            <span className="connection-dot"/>{error ? 'API unavailable' : loading ? 'Connecting…' : index ? 'NASA catalog connected' : 'No catalog'}
          </span>
          <button type="button" className="icon-button" aria-label="Refresh NASA catalog" title="Refresh NASA catalog" onClick={() => void reload()}><RefreshCw size={17}/></button>
        </div>
      </header>
      <main className="main-content" id="main-content"><UiErrorBoundary key={location.pathname}><Outlet/></UiErrorBoundary></main>
      <footer className="app-footer"><span><ShieldCheck size={14}/> Evidence-linked research • Not an operational fire-safety system</span><span>NASA PSI curated excerpts • IGNIS</span></footer>
    </div>
  </div>;
}

export default function App() {
  return <Routes>
    <Route element={<AppLayout/>}>
      <Route index element={<Overview/>}/>
      <Route path="research" element={<Research/>}/>
      <Route path="insights" element={<ScientificInsights/>}/>
      <Route path="experiments" element={<Explorer/>}/>
      <Route path="compare" element={<Comparison/>}/>
      <Route path="passport/:recordId" element={<Passport/>}/>
      <Route path="methodology" element={<Methodology/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Route>
  </Routes>;
}
