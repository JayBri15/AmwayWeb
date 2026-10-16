/** Formatea importes de la aplicación en dólares con convenciones regionales. */
export function money(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount) || 0);
}

/** Genera identificadores únicos para registros locales del prototipo. */
export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
