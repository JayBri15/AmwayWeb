import { DATA_KEY, readCatalog } from "./catalogStorage.js";

/** Usuario de demostración usado cuando aún no existe información guardada. */
const DEMO_ADMIN = {
  id: "admin-demo",
  name: "Administrador demo",
  email: "admin@amway.demo",
  role: "Administrador",
  active: true,
};

/**
 * Valida registros privados que no forman parte del catálogo público.
 * @param {unknown} value Datos JSON que podrían estar incompletos o corruptos.
 * @returns {boolean} True si clientes, administradores y ventas tienen su forma esperada.
 */
function hasValidPrivateRecords(value) {
  const isRecord = (item) => item !== null && typeof item === "object" && !Array.isArray(item);
  const hasUnique = (items, getValue) => {
    const values = items.map(getValue);
    return values.every((item, index) => item && values.indexOf(item) === index);
  };
  if (!isRecord(value)) return false;

  const { customers, admins, sales } = value;
  if (!Array.isArray(customers) || !Array.isArray(admins) || !Array.isArray(sales)) return false;

  const customersValid =
    customers.every(
      (customer) =>
        isRecord(customer) &&
        ["id", "name", "email", "phone"].every((field) => typeof customer[field] === "string")
    ) && hasUnique(customers, (customer) => customer.id);
  const adminsValid =
    admins.every(
      (admin) =>
        isRecord(admin) &&
        ["id", "name", "email", "role"].every((field) => typeof admin[field] === "string") &&
        typeof admin.active === "boolean"
    ) &&
    hasUnique(admins, (admin) => admin.id) &&
    hasUnique(admins, (admin) => admin.email.toLocaleLowerCase("es-MX"));
  const salesValid =
    sales.every(
      (sale) =>
        isRecord(sale) &&
        ["id", "date", "customerName", "paymentMethod", "status"].every(
          (field) => typeof sale[field] === "string"
        ) &&
        (sale.customerId === null || typeof sale.customerId === "string") &&
        Number.isFinite(Date.parse(sale.date)) &&
        Number.isFinite(sale.total) &&
        sale.total >= 0 &&
        ["completed", "voided"].includes(sale.status) &&
        Array.isArray(sale.items) &&
        sale.items.every(
          (item) =>
            isRecord(item) &&
            ["productId", "name", "sku"].every((field) => typeof item[field] === "string") &&
            Number.isFinite(item.unitPrice) &&
            item.unitPrice >= 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        )
    ) && hasUnique(sales, (sale) => sale.id);

  return customersValid && adminsValid && salesValid;
}

/**
 * Lee el modelo completo para Admin, combinando el catálogo compartido con los
 * registros privados. Si los datos privados no pasan el contrato, informa y
 * carga una sesión limpia con los productos de demostración.
 * @returns {import("../models.js").AdminData} Estado inicial válido de Admin.
 */
export function readAdminData() {
  const catalog = readCatalog();
  const defaultData = {
    ...catalog,
    customers: [],
    sales: [],
    admins: [{ ...DEMO_ADMIN }],
  };

  try {
    const stored = localStorage.getItem(DATA_KEY);
    if (!stored) return defaultData;

    const saved = JSON.parse(stored);
    if (!hasValidPrivateRecords(saved)) {
      throw new TypeError("Los registros administrativos guardados no cumplen el modelo de datos.");
    }

    return {
      ...catalog,
      customers: saved.customers,
      sales: saved.sales,
      admins: saved.admins.length ? saved.admins : [{ ...DEMO_ADMIN }],
    };
  } catch (error) {
    console.error("No se pudieron recuperar los datos de administración.", error);
    return defaultData;
  }
}
