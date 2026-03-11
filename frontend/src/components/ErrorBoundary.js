import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e2530',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{
              width: 56, height: 56, background: '#f97316',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, fontSize: 24, fontWeight: 'bold'
            }}>SL</div>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
              Une erreur est survenue
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
              Veuillez rafraichir la page pour continuer.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#f97316', color: '#fff', border: 'none',
                padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer',
                textTransform: 'uppercase', fontSize: 13, letterSpacing: 1
              }}
            >
              Rafraichir la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
