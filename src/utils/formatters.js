export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN');
}

export function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatStatValue(val) {
  if (typeof val === 'number' && val >= 100000) {
    return (val / 100000).toFixed(1) + 'L';
  }
  return val.toLocaleString('en-IN');
}

export function getStatus(member) {
  if (member.deactivated) return 'deactivated';
  if (!member.endDate) return 'active';
  const end = new Date(member.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'expiring_soon';
  return 'active';
}

export function getDaysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

export function getStatusBadgeClass(member) {
  const status = getStatus(member);
  if (status === 'deactivated') return 'badge badge-neutral';
  if (status === 'expired') return 'badge badge-error';
  if (status === 'expiring_soon') return 'badge badge-warning';
  return 'badge badge-success';
}

export function getStatusBadgeText(member) {
  const status = getStatus(member);
  if (status === 'deactivated') return 'Deactivated';
  if (status === 'expired') return 'Expired';
  if (status === 'expiring_soon') return 'Expiring Soon';
  return 'Active';
}

export function planLabel(plan) {
  if (!plan) return '-';
  return plan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function computeStatus(endDateStr, deactivated) {
  if (deactivated) return 'deactivated';
  if (!endDateStr) return 'active';
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'expiring_soon';
  return 'active';
}