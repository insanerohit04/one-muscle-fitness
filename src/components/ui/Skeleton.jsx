export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`skeleton ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({ className = '', variant = 'base', ...props }) {
  const variants = {
    sm: 'skeleton-text-sm',
    base: 'skeleton-text',
    lg: 'skeleton-text-lg',
  };
  return (
    <div
      className={`skeleton ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function SkeletonAvatar({ className = '', variant = 'base', ...props }) {
  const variants = {
    sm: 'w-8 h-8',
    base: 'skeleton-avatar',
    lg: 'skeleton-avatar-lg',
    xl: 'w-20 h-20 rounded-2xl',
  };
  return (
    <div
      className={`skeleton rounded-full ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '', children, ...props }) {
  return (
    <div
      className={`skeleton-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SkeletonStatCard({ className = '', ...props }) {
  return (
    <div
      className={`skeleton-stat-card ${className}`}
      {...props}
    />
  );
}

export function SkeletonTableRow({ className = '', cells = 6, ...props }) {
  return (
    <tr className={`skeleton-table-row ${className}`} {...props}>
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="skeleton skeleton-table-cell" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ className = '', rows = 5, cols = 6, ...props }) {
  return (
    <table className={`w-full ${className}`} role="table" {...props}>
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="pb-3" scope="col">
              <div className="skeleton skeleton-text-sm" style={{ width: '80px' }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <SkeletonTableRow key={rowIndex} cells={cols} />
        ))}
      </tbody>
    </table>
  );
}

export function SkeletonButton({ className = '', variant = 'base', ...props }) {
  const variants = {
    base: 'skeleton-btn',
    sm: 'skeleton-btn h-8 px-3',
    lg: 'skeleton-btn h-12 px-6',
  };
  return (
    <div
      className={`${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function SkeletonInput({ className = '', ...props }) {
  return (
    <div
      className={`skeleton-input ${className}`}
      {...props}
    />
  );
}

export function SkeletonBadge({ className = '', ...props }) {
  return (
    <div
      className={`skeleton-badge ${className}`}
      {...props}
    />
  );
}

export function SkeletonDivider({ className = '', ...props }) {
  return (
    <div
      className={`skeleton-divider ${className}`}
      {...props}
    />
  );
}

export function SkeletonImage({ className = '', ...props }) {
  return (
    <div
      className={`skeleton-image ${className}`}
      {...props}
    />
  );
}

export function SkeletonStatGrid({ className = '', cards = 6, ...props }) {
  return (
    <div
      className={`stat-grid ${className}`}
      role="list"
      {...props}
    >
      {Array.from({ length: cards }).map((_, index) => (
        <SkeletonStatCard
          key={index}
          className="animate-fade-in-up"
          style={{ animationDelay: `${(index + 1) * 50}ms` }}
          role="listitem"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="skeleton skeleton-text-sm mb-2" style={{ width: '60%' }} />
              <div className="skeleton skeleton-text-lg" style={{ width: '40%' }} />
            </div>
            <div className="skeleton w-12 h-12 rounded-xl" />
          </div>
          <div className="skeleton skeleton-divider mt-4 mb-2" />
          <div className="skeleton skeleton-text-sm" style={{ width: '30%' }} />
        </SkeletonStatCard>
      ))}
    </div>
  );
}