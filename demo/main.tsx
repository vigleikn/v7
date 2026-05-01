import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

type BoundaryState = { hasError: boolean; message?: string };

class DemoErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('App render failed:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Noe gikk galt</h1>
          <p style={{ color: '#444', marginBottom: 12 }}>{this.state.message}</p>
          <p style={{ color: '#444' }}>
            Prøv å tømme nettleserens lagring for nøkkelen{' '}
            <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
              transaction-store
            </code>{' '}
            (Application → Local Storage) og last siden på nytt.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoErrorBoundary>
      <App />
    </DemoErrorBoundary>
  </React.StrictMode>
);
