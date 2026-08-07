import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Click2Ship side panel render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app error-screen">
        <section className="error-card" role="alert">
          <h1>Click2Ship encountered an error</h1>
          <p>{this.state.error.message}</p>
          {import.meta.env.DEV && <pre>{this.state.error.stack}</pre>}
        </section>
      </main>
    );
  }
}
