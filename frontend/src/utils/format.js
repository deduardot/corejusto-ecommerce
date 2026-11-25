export function formatMoney(amount, symbol = 'Bs.') {
  const value = Number(amount) || 0;
  return `${symbol} ${value.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getApiError(error, fallback = 'Ocurrió un error inesperado') {
  return error?.response?.data?.mensaje || error?.message || fallback;
}