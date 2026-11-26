import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n';

// One page failing (e.g. an unexpected API response) must not blank the whole app (UX review 2026-11-26,
// regression REG-03). Wraps the routed page in Layout; sidebar and header stay usable.

export default class PageErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page crashed', error, info.componentStack); }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card page-crash" role="alert">
        <h2>{i18n.t('uxFix.crashTitle')}</h2>
        <p>{i18n.t('uxFix.crashBody')}</p>
        <div className="page-crash-actions">
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>{i18n.t('uxFix.retry')}</button>
          <a className="btn btn-ghost" href="/dashboard">{i18n.t('uxFix.toDashboard')}</a>
        </div>
      </div>
    );
  }
}
