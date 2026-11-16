import type { ReactNode } from 'react';
import { AlertTriangle, ArrowUpRight, Database, RefreshCw, SearchX } from 'lucide-react';

export function PageHeading({ eyebrow, title, description, actions }: {
  eyebrow: string; title: string; description: string; actions?: ReactNode;
}) {
  return <div className="page-heading">
    <div><div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div>
      <h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="heading-actions">{actions}</div>}
  </div>;
}

export function Panel({ title, description, children, className = '', action }: {
  title?: string; description?: string; children: ReactNode; className?: string; action?: ReactNode;
}) {
  return <section className={`panel ${className}`}>
    {(title || description || action) && <div className="panel-heading"><div>
      {title && <h2>{title}</h2>}{description && <p>{description}</p>}
    </div>{action}</div>}
    {children}
  </section>;
}

export function StatCard({ label, value, note, icon }: {
  label: string; value: string | number; note: string; icon: ReactNode;
}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
    <div className="stat-value">{value}</div><p>{note}</p></div>;
}

export function Notice({ title, children, tone = 'info' }: {
  title?: string; children: ReactNode; tone?: 'info' | 'warning' | 'success';
}) {
  return <div className={`notice notice-${tone}`} role={tone === 'warning' ? 'alert' : 'note'}>
    <AlertTriangle size={17} aria-hidden="true"/><div>{title && <strong>{title}</strong>}<div>{children}</div></div>
  </div>;
}

export function Loading({ label = 'Loading verified research records…' }: { label?: string }) {
  return <div className="state-panel" role="status"><div className="loader"/><strong>{label}</strong><p>Reading your local FastAPI catalog.</p></div>;
}

export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="state-panel"><SearchX size={28}/><strong>{title}</strong><p>{description}</p></div>;
}

export function ApiError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-panel state-error" role="alert"><AlertTriangle size={28}/><strong>Unable to load research data</strong>
    <p>{message}</p><p>Check that FastAPI is running on <code>127.0.0.1:8000</code>, then retry.</p>
    {onRetry && <button type="button" className="button button-primary" onClick={onRetry}><RefreshCw size={15}/> Retry</button>}
  </div>;
}

export function SourceBadge({ sourceId }: { sourceId: string }) {
  return <span className={`source-badge ${sourceId === 'PSI-25' ? 'source-bass' : 'source-flex'}`}>
    <Database size={12}/>{sourceId === 'PSI-25' ? 'BASS-II' : sourceId === 'PSI-69' ? 'FLEX' : sourceId}
  </span>;
}

export function ExternalSource({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-external">
    {children}<ArrowUpRight size={14} aria-hidden="true"/>
  </a>;
}
