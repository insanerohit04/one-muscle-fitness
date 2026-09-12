import { useState } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  iconClassName = 'w-14 h-14 text-gray-300',
  titleClassName = 'text-lg font-medium text-gray-900 mb-2',
  descriptionClassName = 'text-gray-500 mb-6 max-w-xs',
}) {
  return (
    <div className={`empty-state text-center animate-fade-in-up ${className}`}>
      {icon && (
        <div className="empty-state-icon flex-shrink-0 mx-auto mb-4" aria-hidden="true">
          {typeof icon === 'function' ? (
            <icon className={iconClassName} />
          ) : (
            icon
          )}
        </div>
      )}
      {title && <h3 className={titleClassName}>{title}</h3>}
      {description && <p className={descriptionClassName}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EmptyStateWithImage({
  image,
  imageAlt,
  title,
  description,
  action,
  className = '',
  imageClassName = 'w-48 h-48 mx-auto mb-4 opacity-50',
}) {
  return (
    <div className={`empty-state text-center animate-fade-in-up ${className}`}>
      {image && (
        <img
          src={image}
          alt={imageAlt || ''}
          className={imageClassName}
          aria-hidden="true"
        />
      )}
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      {description && <p className="text-gray-500 mb-6 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

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

export function NoDataState({
  title = 'No data found',
  description,
  action,
  icon,
  className = '',
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}