import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

const RECOVERY_KEY = 'tlsunchat:error-recovery';
const LAST_ERROR_KEY = 'tlsunchat:last-error';

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  private recoveryClearTimer: number | null = null;

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidMount() {
    this.recoveryClearTimer = window.setTimeout(() => {
      if (!this.state.hasError) sessionStorage.removeItem(RECOVERY_KEY);
    }, 5000);
  }

  componentWillUnmount() {
    if (this.recoveryClearTimer) window.clearTimeout(this.recoveryClearTimer);
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error('App crashed:', error, errorInfo);
    localStorage.setItem(LAST_ERROR_KEY, JSON.stringify({
      message,
      stack,
      componentStack: errorInfo.componentStack,
      at: new Date().toISOString()
    }));

    if (sessionStorage.getItem(RECOVERY_KEY) !== '1') {
      sessionStorage.setItem(RECOVERY_KEY, '1');
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-green-100 rounded-2xl shadow-xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto mb-4 flex items-center justify-center font-bold">
            !
          </div>
          <h1 className="text-gray-900 font-bold text-lg">App can tai lai</h1>
          <p className="text-gray-500 text-sm mt-2">
            App vua gap loi khi khoi phuc tu nen. Bam tai lai de mo lai app.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-semibold transition-colors"
          >
            Tai lai
          </button>
        </div>
      </div>
    );
  }
}
