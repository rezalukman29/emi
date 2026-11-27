import { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation, type WithTranslation } from 'react-i18next';
import type { QueryClient } from 'react-query';

class PageErrorBoundary extends Component<WithTranslation & { children: ReactNode; queryClient: QueryClient }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page error', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="card" role="alert"><p>{this.props.t('recovery.pageFailed')}</p>
      <button type="button" className="btn btn-ghost" onClick={() => { void this.props.queryClient.resetQueries(); this.setState({ failed: false }); }}>{this.props.t('recovery.retry')}</button>{' '}
      <a href="/dashboard">{this.props.t('recovery.dashboard')}</a></div>;
  }
}
export default withTranslation()(PageErrorBoundary);
