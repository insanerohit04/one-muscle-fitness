import React, { useState } from 'react';

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  icon,
  className = '',
  onRetry,
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center animate-fade-in-up ${className}`} role="alert">
      <div className="w-14 h-14 text-red-400 mx-auto mb-4 flex-shrink-0" aria-hidden="true">
        {icon || (
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      {message && <p className="text-gray-600 mb-6 max-w-md">{message}</p>}
      {action && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="btn-primary"
        >
          {isRetrying ? 'Retrying...' : action}
        </button>
      )}
    </div>
  );
}

export function InlineError({
  message,
  className = '',
  onDismiss,
}) {
  return (
    <div
      className={`mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm ${className}`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-red-600 hover:text-red-800 font-medium"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback, onError }) {
  return (
    <ErrorBoundaryImpl fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundaryImpl>
  );
}

class ErrorBoundaryImpl extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorState
          title="Something went wrong"
          message="We encountered an unexpected error. Please try refreshing the page."
        />
      );
    }

    return this.props.children;
  }
}

// Need to import React for the class component
