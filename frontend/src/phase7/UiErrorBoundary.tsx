import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import './phase7.css';

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Catches render-time React failures. API errors remain handled by existing pages. */
export class UiErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Do not print research questions, API payloads, or stack traces to the UI.
    if (import.meta.env.DEV) {
      console.error('IGNIS UI render failure', error.name, info.componentStack);
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="p7-error" role="alert" aria-live="assertive">
      <AlertTriangle size={26} aria-hidden="true" />
      <div>
        <h2>This section could not be displayed</h2>
        <p>No experimental data was substituted. You can retry or open another section.</p>
        <button type="button" onClick={() => this.setState({ failed: false })}>
          <RotateCcw size={15} aria-hidden="true" /> Retry section
        </button>
      </div>
    </section>;
  }
}
