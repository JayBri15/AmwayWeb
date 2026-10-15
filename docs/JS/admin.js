// Configuración y modelo de datos
const CONFIG = {
  storageKey: "amway-admin-demo-data-v1",
  sessionKey: "amway-admin-demo-session-v1",
  demoEmail: "admin@amway.demo",
  demoPassword: "amway123",
  lowStockLimit: 5,
  locale: "es-MX",
  currency: "USD",
  paymentMethods: ["Efectivo", "Tarjeta (registro demo)", "Transferencia (registro demo)"],
  adminRoles: ["Administrador", "Gerente", "Operador"]
};

const DATA_COLLECTIONS = Object.freeze(["products", "categories", "customers", "sales", "admins"]);
const SALE_STATUS = Object.freeze({ COMPLETED: "completed", VOIDED: "voided" });
const currencyFormatter = new Intl.NumberFormat(CONFIG.locale, {
  style: "currency",
  currency: CONFIG.currency
});

/**
 * Modelos del prototipo:
 * - Product: { id, name, sku, category, detail, price, stock }
 * - Customer: { id, name, email, phone }
 * - Admin: { id, name, email, role, active }
 * - Sale: { id, date, customerId, customerName, paymentMethod, items, total, status }
 * - Sale item: { productId, name, sku, unitPrice, quantity }
 * - Cart item: { productId, quantity } (temporal y no se persiste como venta)
 *
 * Las ventas conservan una instantánea del nombre, SKU y precio del producto.
 * `customerId` y `productId` relacionan los registros vigentes cuando aplica.
 */
const INITIAL_DATA = {
  products: [
    {
      id: "nutrilite-daily",
      name: "Nutrilite Daily",
      sku: "NUT-001",
      category: "Nutrición",
      detail: "Vitaminas y suplementos",
      price: 28.5,
      stock: 24
    },
    {
      id: "artistry-skin",
      name: "Artistry Skin Nutrition",
      sku: "ART-001",
      category: "Belleza",
      detail: "Cuidado de la piel",
      price: 42,
      stock: 14
    },
    {
      id: "body-series",
      name: "Geles de baño Body Series",
      sku: "BODY-001",
      category: "Cuidado personal",
      detail: "Baño y cuidado del cuerpo",
      price: 16.75,
      stock: 18
    },
    {
      id: "dish-drops",
      name: "Concentrado Dish Drops",
      sku: "HOME-001",
      category: "En casa",
      detail: "Artículos de limpieza",
      price: 12.9,
      stock: 31
    },
    {
      id: "protein",
      name: "Nutrilite All Plant Protein",
      sku: "NUT-002",
      category: "Nutrición",
      detail: "Nutrición deportiva",
      price: 35.5,
      stock: 9
    },
    {
      id: "artistry-lip",
      name: "Artistry Go Vibrant",
      sku: "ART-002",
      category: "Belleza",
      detail: "Maquillaje",
      price: 24,
      stock: 11
    },
    {
      id: "glister",
      name: "Pasta dental Glister",
      sku: "CARE-001",
      category: "Cuidado personal",
      detail: "Cuidado bucal",
      price: 9.5,
      stock: 27
    },
    {
      id: "e-spring",
      name: "Sistema eSpring",
      sku: "HOME-002",
      category: "En casa",
      detail: "Tratamiento de agua",
      price: 289,
      stock: 4
    }
  ],
  categories: ["Nutrición", "Belleza", "Cuidado personal", "En casa"],
  customers: [],
  sales: [],
  admins: [{ id: "admin-demo", name: "Administrador demo", email: CONFIG.demoEmail, role: "Administrador", active: true }]
};

// Cada ruta enlaza su título con el renderizador que construye la vista.
const VIEWS = {
  dashboard: { title: "Resumen", render: renderDashboard },
  pos: { title: "Punto de venta", render: renderPos },
  products: { title: "Productos", render: renderProducts },
  inventory: { title: "Inventario", render: renderInventory },
  categories: { title: "Categorías", render: renderCategories },
  customers: { title: "Clientes", render: renderCustomers },
  sales: { title: "Ventas", render: renderSales },
  admins: { title: "Administradores", render: renderAdmins }
};

// Referencias al documento y estado temporal de la interfaz.
const loginScreen = document.querySelector("#login-screen");
const loginForm = document.querySelector("#login-form");
const app = document.querySelector("#admin-app");
const pageContent = document.querySelector("#page-content");
const pageTitle = document.querySelector("#page-title");
const dialog = document.querySelector("#entity-dialog");
const entityForm = document.querySelector("#entity-form");
const dialogFields = document.querySelector("#dialog-fields");
const dialogTitle = document.querySelector("#dialog-title");
const formError = document.querySelector("#form-error");
const toastRegion = document.querySelector("#toast-region");
let activeView = "dashboard";
let cart = [];
let posCustomerId = "";
let posPaymentMethod = CONFIG.paymentMethods[0];
let data = loadData();
let lastSavedData = structuredClone(data);

// Mensajes no bloqueantes para confirmaciones y errores.
function notify(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = isError ? "toast error" : "toast";
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4500);
}

// Acceso a datos locales: valida el contrato al leer y revierte cambios fallidos al guardar.
function isValidData(value) {
  const isRecord = (item) => item !== null && typeof item === "object" && !Array.isArray(item);
  const hasTextFields = (item, fields) =>
    isRecord(item) && fields.every((field) => typeof item[field] === "string");

  if (!isRecord(value) || !DATA_COLLECTIONS.every((key) => Array.isArray(value[key]))) return false;

  const validProducts = value.products.every((product) =>
    hasTextFields(product, ["id", "name", "sku", "category", "detail"]) &&
    value.categories.includes(product.category) &&
    Number.isFinite(product.price) && product.price > 0 &&
    Number.isInteger(product.stock) && product.stock >= 0
  );
  const validCategories = value.categories.every((category) => typeof category === "string");
  const validCustomers = value.customers.every((customer) =>
    hasTextFields(customer, ["id", "name", "email", "phone"])
  );
  const validAdmins = value.admins.every((admin) =>
    hasTextFields(admin, ["id", "name", "email", "role"]) && typeof admin.active === "boolean"
  );
  const validSales = value.sales.every((sale) =>
    hasTextFields(sale, ["id", "date", "customerName", "paymentMethod", "status"]) &&
    (sale.customerId === null || typeof sale.customerId === "string") &&
    Number.isFinite(Date.parse(sale.date)) &&
    Number.isFinite(sale.total) && sale.total >= 0 &&
    [SALE_STATUS.COMPLETED, SALE_STATUS.VOIDED].includes(sale.status) &&
    Array.isArray(sale.items) &&
    sale.items.every((item) =>
      hasTextFields(item, ["productId", "name", "sku"]) &&
      Number.isFinite(item.unitPrice) && item.unitPrice >= 0 &&
      Number.isInteger(item.quantity) && item.quantity > 0
    )
  );

  return validProducts && validCategories && validCustomers && validAdmins && validSales;
}

function loadData() {
  try {
    const stored = localStorage.getItem(CONFIG.storageKey);
    if (!stored) return structuredClone(INITIAL_DATA);
    const parsed = JSON.parse(stored);
    if (!isValidData(parsed)) throw new Error("El formato guardado no coincide con el modelo esperado.");
    return parsed;
  } catch (error) {
    console.error("No se pudieron recuperar los datos del portal.", error);
    window.setTimeout(() => notify("No se pudieron leer los datos guardados. Se cargarán datos de demostración.", true), 0);
    return structuredClone(INITIAL_DATA);
  }
}

function saveData() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
    lastSavedData = structuredClone(data);
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los datos del portal.", error);
    for (const key of DATA_COLLECTIONS) {
      const currentItems = data[key];
      data[key] = lastSavedData[key].map((savedItem) => {
        if (!savedItem || typeof savedItem !== "object") return savedItem;
        const currentItem = currentItems.find((item) => item.id === savedItem.id);
        if (!currentItem) return structuredClone(savedItem);
        Object.keys(currentItem).forEach((property) => {
          if (!(property in savedItem)) delete currentItem[property];
        });
        Object.assign(currentItem, structuredClone(savedItem));
        return currentItem;
      });
    }
    notify("No se pudieron guardar los cambios en este navegador.", true);
    return false;
  }
}

function money(value) {
  return currencyFormatter.format(Number(value) || 0);
}

// Utilidades para identificadores y creación segura de nodos DOM.
function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function actionButton(label, action, id, className = "text-button", entity = "") {
  const button = element("button", className, label);
  button.type = "button";
  button.dataset.action = action;
  if (id) button.dataset.id = id;
  if (entity) button.dataset.entity = entity;
  return button;
}

// La sesión se conserva solo en esta pestaña y no representa autenticación real.
function setSession(isActive) {
  try {
    if (isActive) sessionStorage.setItem(CONFIG.sessionKey, "active");
    else sessionStorage.removeItem(CONFIG.sessionKey);
  } catch (error) {
    console.error("No se pudo guardar el estado de la sesión demo.", error);
    notify("El navegador no permitió guardar la sesión de demostración.", true);
  }
}

function showApp() {
  loginScreen.hidden = true;
  app.hidden = false;
  render();
}

function showLogin() {
  app.hidden = true;
  loginScreen.hidden = false;
  loginForm.reset();
  document.querySelector("#login-email").value = CONFIG.demoEmail;
}

// Autenticación de demostración local; no protege datos reales.
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim().toLocaleLowerCase(CONFIG.locale);
  const password = String(formData.get("password") || "");
  if (email !== CONFIG.demoEmail || password !== CONFIG.demoPassword) {
    notify("Correo o contraseña demo incorrectos.", true);
    return;
  }
  setSession(true);
  showApp();
});

try {
  if (sessionStorage.getItem(CONFIG.sessionKey) === "active") showApp();
} catch (error) {
  console.error("No se pudo recuperar el estado de la sesión demo.", error);
  notify("No se pudo recuperar la sesión demo. Inicia sesión nuevamente.", true);
}

function render() {
  if (!VIEWS[activeView]) activeView = "dashboard";
  pageTitle.textContent = VIEWS[activeView].title;
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
  pageContent.replaceChildren();
  VIEWS[activeView].render();
}

function pageIntro(title, description, buttonText, action) {
  const intro = element("div", "page-intro");
  const copy = element("div");
  copy.append(element("h2", "", title), element("p", "", description));
  intro.append(copy);
  if (buttonText) {
    const actions = element("div", "intro-actions");
    actions.append(actionButton(buttonText, action, "", "button button-primary"));
    intro.append(actions);
  }
  return intro;
}

function makePanel(title, rows, headings, options = {}) {
  const panel = element("section", `panel ${options.className || ""}`);
  const heading = element("div", "panel-heading");
  heading.append(element("h3", "", title));
  if (options.action) heading.append(actionButton(options.action.label, options.action.name, "", "", ""));
  panel.append(heading);
  if (!rows.length) {
    panel.append(element("div", "empty-state", options.empty || "Aún no hay registros."));
    return panel;
  }
  const wrap = element("div", "table-wrap");
  const table = element("table", "data-table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headings.forEach((headingText) => headRow.append(element("th", "", headingText)));
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => tbody.append(row));
  table.append(thead, tbody);
  wrap.append(table);
  panel.append(wrap);
  return panel;
}

function makeRow(cells) {
  const row = document.createElement("tr");
  cells.forEach((cell) => {
    const td = document.createElement("td");
    if (cell instanceof Node) td.append(cell);
    else td.textContent = cell;
    row.append(td);
  });
  return row;
}

function actionGroup(...buttons) {
  const group = element("div", "table-actions");
  buttons.forEach((button) => group.append(button));
  return group;
}

// Renderizadores de páginas
function renderDashboard() {
  const today = new Date().toDateString();
  const todaysSales = data.sales.filter((sale) => sale.status === SALE_STATUS.COMPLETED && new Date(sale.date).toDateString() === today);
  const todayTotal = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const lowStock = data.products.filter((product) => product.stock <= CONFIG.lowStockLimit).length;
  const metrics = element("div", "metric-grid");
  [
    ["Ventas de hoy", money(todayTotal), `${todaysSales.length} transacciones`, "↗"],
    ["Productos", String(data.products.length), `${data.categories.length} categorías`, "◇"],
    ["Stock bajo", String(lowStock), `Umbral: ${CONFIG.lowStockLimit} unidades o menos`, "▤"],
    ["Clientes", String(data.customers.length), "Registrados en el portal", "♙"]
  ].forEach(([label, value, foot, icon]) => {
    const card = element("article", "metric-card");
    const top = element("div", "metric-top");
    top.append(element("span", "", label), element("span", "metric-icon", icon));
    card.append(top, element("p", "metric-value", value), element("span", "metric-foot", foot));
    metrics.append(card);
  });
  pageContent.append(pageIntro("Un vistazo a tu operación", "Resumen de actividad y accesos rápidos al portal."), metrics);

  const grid = element("div", "dashboard-grid");
  const recent = data.sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const recentRows = recent.map((sale) => makeRow([
    element("strong", "", sale.id.slice(-8).toUpperCase()),
    new Date(sale.date).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }),
    sale.customerName || "Venta de mostrador",
    money(sale.total),
    element("span", `status-pill ${sale.status === SALE_STATUS.VOIDED ? "voided" : ""}`, sale.status === SALE_STATUS.VOIDED ? "Anulada" : "Completada")
  ]));
  grid.append(makePanel("Actividad reciente", recentRows, ["Venta", "Fecha", "Cliente", "Total", "Estado"], {
    empty: "Aún no hay ventas. Registra una desde el punto de venta."
  }));
  const quickPanel = element("section", "panel");
  quickPanel.append(element("div", "panel-heading", "Accesos rápidos"));
  const quickBody = element("div", "panel-body quick-actions");
  [
    ["▣", "Iniciar una venta", "pos"],
    ["+", "Agregar producto", "create-product"],
    ["♙", "Registrar cliente", "create-customer"]
  ].forEach(([icon, text, action]) => {
    const button = element("button", "quick-action");
    button.type = "button";
    button.dataset.action = action;
    button.append(element("span", "", icon), element("span", "", text), element("span", "", "→"));
    quickBody.append(button);
  });
  quickPanel.append(quickBody);
  grid.append(quickPanel);
  pageContent.append(grid);
}

function makeToolbar(note, action, placeholder = "Buscar...") {
  const toolbar = element("div", "toolbar");
  const search = element("label", "search-box");
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder);
  input.dataset.filterTable = "true";
  search.append(input);
  toolbar.append(search, element("span", "toolbar-note", note));
  if (action) toolbar.append(actionButton(action.label, action.name, "", "button button-primary"));
  return toolbar;
}

function renderProducts() {
  pageContent.append(
    pageIntro("Catálogo de productos", "Administra nombres, SKU, precios, categorías y existencias.", "＋ Nuevo producto", "create-product"),
    makeToolbar(`${data.products.length} productos registrados`, null, "Buscar por nombre, SKU o categoría")
  );
  const rows = data.products.map((product) => makeRow([
    element("strong", "", product.name),
    product.sku,
    product.category,
    money(product.price),
    product.stock <= CONFIG.lowStockLimit ? element("span", "stock-warning", String(product.stock)) : element("span", "stock-ok", String(product.stock)),
    actionGroup(
      actionButton("Editar", "edit-product", product.id),
      actionButton("Eliminar", "delete-product", product.id, "text-button danger")
    )
  ]));
  pageContent.append(makePanel("Todos los productos", rows, ["Producto", "SKU", "Categoría", "Precio", "Stock", "Acciones"], {
    empty: "No hay productos en el catálogo."
  }));
}

function renderInventory() {
  const lowCount = data.products.filter((product) => product.stock <= CONFIG.lowStockLimit).length;
  pageContent.append(
    pageIntro("Control de inventario", "Consulta existencias y ajusta el stock físico de cada producto."),
    makeToolbar(`${lowCount} productos con stock bajo (≤ ${CONFIG.lowStockLimit})`, null, "Buscar producto o SKU")
  );
  const rows = data.products.map((product) => makeRow([
    element("strong", "", product.name),
    product.sku,
    product.category,
    product.stock <= CONFIG.lowStockLimit ? element("span", "stock-warning", `${product.stock} · Reponer`) : element("span", "stock-ok", `${product.stock} · Disponible`),
    actionButton("Ajustar stock", "edit-stock", product.id, "button button-quiet button-small")
  ]));
  pageContent.append(makePanel("Existencias", rows, ["Producto", "SKU", "Categoría", "Estado", "Acciones"], {
    empty: "Agrega productos para comenzar a controlar el inventario."
  }));
}

function renderCategories() {
  pageContent.append(
    pageIntro("Categorías", "Organiza los productos de tu catálogo.", "＋ Nueva categoría", "create-category"),
    makeToolbar(`${data.categories.length} categorías`, null)
  );
  const rows = data.categories.map((category) => {
    const count = data.products.filter((product) => product.category === category).length;
    const matchingProduct = data.products.some((product) => product.category === category);
    return makeRow([
      element("strong", "", category),
      String(count),
      actionGroup(
        actionButton("Editar", "edit-category", category),
        actionButton("Eliminar", "delete-category", category, `text-button ${matchingProduct ? "" : "danger"}`)
      )
    ]);
  });
  pageContent.append(makePanel("Categorías del catálogo", rows, ["Nombre", "Productos", "Acciones"], {
    empty: "Aún no hay categorías."
  }));
}

function renderCustomers() {
  pageContent.append(
    pageIntro("Directorio de clientes", "Guarda los datos de contacto para asociarlos a las ventas.", "＋ Nuevo cliente", "create-customer"),
    makeToolbar(`${data.customers.length} clientes registrados`, null, "Buscar nombre, correo o teléfono")
  );
  const rows = data.customers.map((customer) => makeRow([
    element("strong", "", customer.name),
    customer.email || "—",
    customer.phone || "—",
    actionGroup(
      actionButton("Editar", "edit-customer", customer.id),
      actionButton("Eliminar", "delete-customer", customer.id, "text-button danger")
    )
  ]));
  pageContent.append(makePanel("Clientes", rows, ["Nombre", "Correo", "Teléfono", "Acciones"], {
    empty: "Aún no hay clientes registrados."
  }));
}

function renderAdmins() {
  pageContent.append(
    pageIntro("Usuarios administradores", "Directorio de demostración; no concede acceso real ni reemplaza autenticación segura.", "＋ Nuevo administrador", "create-admin"),
    makeToolbar(`${data.admins.length} usuarios registrados`, null, "Buscar nombre o correo")
  );
  const rows = data.admins.map((admin) => makeRow([
    element("strong", "", admin.name),
    admin.email,
    admin.role,
    element("span", `status-pill ${admin.active ? "" : "voided"}`, admin.active ? "Activo" : "Inactivo"),
    actionGroup(
      actionButton("Editar", "edit-admin", admin.id),
      actionButton("Eliminar", "delete-admin", admin.id, "text-button danger")
    )
  ]));
  pageContent.append(makePanel("Directorio de usuarios", rows, ["Nombre", "Correo", "Rol", "Estado", "Acciones"], {
    empty: "Aún no hay usuarios administradores."
  }));
}

function renderSales() {
  pageContent.append(
    pageIntro("Historial de ventas", "Consulta operaciones. Anular una venta devuelve las unidades al inventario.", "＋ Nueva venta", "pos"),
    makeToolbar(`${data.sales.length} ventas registradas`, null, "Buscar venta, cliente o método de pago")
  );
  const sales = data.sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const rows = sales.map((sale) => {
    const action = sale.status === SALE_STATUS.COMPLETED
      ? actionButton("Anular venta", "void-sale", sale.id, "text-button danger")
      : element("span", "toolbar-note", "—");
    return makeRow([
      element("strong", "", sale.id.slice(-8).toUpperCase()),
      new Date(sale.date).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }),
      sale.customerName || "Venta de mostrador",
      sale.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      sale.paymentMethod,
      money(sale.total),
      element("span", `status-pill ${sale.status === SALE_STATUS.VOIDED ? "voided" : ""}`, sale.status === SALE_STATUS.VOIDED ? "Anulada" : "Completada"),
      action
    ]);
  });
  pageContent.append(makePanel("Todas las ventas", rows, ["Venta", "Fecha", "Cliente", "Unidades", "Pago", "Total", "Estado", "Acción"], {
    empty: "Aún no hay ventas. Registra la primera desde el punto de venta."
  }));
}

function renderPos() {
  pageContent.append(pageIntro("Punto de venta", "Agrega productos a la venta; el stock se descuenta al confirmar el cobro."));
  const layout = element("div", "pos-layout");
  const left = element("section");
  const productSearch = element("label", "search-box");
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.placeholder = "Buscar producto por nombre o SKU";
  searchInput.setAttribute("aria-label", "Buscar producto por nombre o SKU");
  searchInput.dataset.posSearch = "true";
  productSearch.append(searchInput);
  left.append(productSearch);
  const productGrid = element("div", "pos-products");
  productGrid.dataset.posProducts = "true";
  left.append(productGrid);
  const cartPanel = element("section", "panel pos-cart");
  cartPanel.dataset.cartPanel = "true";
  layout.append(left, cartPanel);
  pageContent.append(layout);
  drawPosProducts(productGrid);
  drawCart(cartPanel);
}

function drawPosProducts(container) {
  const query = container.closest(".pos-layout")?.querySelector("[data-pos-search]")?.value.trim().toLocaleLowerCase(CONFIG.locale) || "";
  container.replaceChildren();
  const products = data.products.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase(CONFIG.locale).includes(query)
  );
  if (!products.length) {
    container.append(element("div", "empty-state", "No se encontraron productos."));
    return;
  }
  products.forEach((product) => {
    const card = element("article", "pos-product");
    const top = element("div", "pos-product-top");
    top.append(element("span", "", product.category), element("span", "", `Stock: ${product.stock}`));
    const bottom = element("div", "pos-product-bottom");
    const add = element("button", "pos-add", "+");
    add.type = "button";
    add.title = `Agregar ${product.name}`;
    add.setAttribute("aria-label", `Agregar ${product.name} al carrito`);
    add.dataset.action = "pos-add";
    add.dataset.id = product.id;
    add.disabled = product.stock < 1;
    bottom.append(element("strong", "", money(product.price)), add);
    card.append(top, element("h3", "", product.name), element("p", "", product.sku), bottom);
    container.append(card);
  });
}

function drawCart(container) {
  container.replaceChildren();
  const heading = element("div", "panel-heading");
  heading.append(element("h3", "", `Venta actual · ${cart.reduce((sum, item) => sum + item.quantity, 0)} artículos`));
  container.append(heading);
  const cartItems = element("div", "pos-cart-items");
  if (!cart.length) cartItems.append(element("div", "empty-state", "Agrega productos para iniciar la venta."));
  cart.forEach((item) => {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    if (!product) return;
    const line = element("div", "cart-line");
    const copy = element("div");
    copy.append(element("strong", "", product.name), element("small", "", `${money(product.price)} c/u`));
    const total = element("div", "cart-line-total");
    total.append(element("strong", "", money(product.price * item.quantity)));
    const controls = element("div", "quantity-control");
    controls.append(
      actionButton("−", "cart-decrement", product.id, "quantity-button"),
      element("span", "", String(item.quantity)),
      actionButton("+", "cart-increment", product.id, "quantity-button"),
      actionButton("×", "cart-remove", product.id, "text-button danger")
    );
    total.append(controls);
    line.append(copy, total);
    cartItems.append(line);
  });
  container.append(cartItems);

  const summary = element("div", "cart-summary");
  const subtotal = cart.reduce((sum, item) => {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
  const customerLabel = element("label", "field-label", "Cliente (opcional)");
  customerLabel.htmlFor = "pos-customer";
  const customerSelect = document.createElement("select");
  customerSelect.id = "pos-customer";
  customerSelect.className = "pos-select";
  customerSelect.dataset.posCustomer = "true";
  customerSelect.append(new Option("Venta de mostrador", ""));
  data.customers.forEach((customer) => customerSelect.append(new Option(customer.name, customer.id)));
  customerSelect.value = posCustomerId;
  const paymentLabel = element("label", "field-label", "Método de pago");
  paymentLabel.htmlFor = "pos-payment";
  const paymentSelect = document.createElement("select");
  paymentSelect.id = "pos-payment";
  paymentSelect.className = "pos-select";
  paymentSelect.dataset.posPayment = "true";
  CONFIG.paymentMethods.forEach((method) =>
    paymentSelect.append(new Option(method, method))
  );
  paymentSelect.value = posPaymentMethod;
  const totalRow = element("div", "cart-summary-row total");
  totalRow.append(element("span", "", "Total"), element("strong", "", money(subtotal)));
  const checkout = actionButton("Confirmar venta", "checkout", "", "button button-primary checkout-button");
  checkout.disabled = cart.length === 0;
  summary.append(customerLabel, customerSelect, paymentLabel, paymentSelect, totalRow, checkout);
  container.append(summary);
}

// Formularios CRUD
function openForm(title, fields, onSave) {
  dialogTitle.textContent = title;
  dialogFields.replaceChildren();
  formError.hidden = true;
  formError.textContent = "";
  fields.forEach((field) => {
    const wrapper = element("div", field.full ? "field-full" : "");
    const label = element("label", "field-label", field.label);
    const input = field.type === "select" ? document.createElement("select") : document.createElement("input");
    input.name = field.name;
    input.id = `form-${field.name}`;
    if (field.type === "select") {
      field.options.forEach((option) => input.append(new Option(option, option)));
    } else {
      input.type = field.type || "text";
      if (field.step) input.step = field.step;
      if (field.min !== undefined) input.min = String(field.min);
      if (field.maxLength) input.maxLength = field.maxLength;
      if (field.readOnly) input.readOnly = true;
    }
    input.required = Boolean(field.required);
    if (field.value !== undefined) input.value = String(field.value);
    label.htmlFor = input.id;
    wrapper.append(label, input);
    dialogFields.append(wrapper);
  });
  entityForm.onsubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(entityForm);
    const result = onSave(formData);
    if (result === false) return;
    dialog.close();
    render();
  };
  dialog.showModal();
}

function openProductForm(product = null) {
  if (!data.categories.length) {
    notify("Primero crea una categoría para asignarla al producto.", true);
    return;
  }
  const editing = Boolean(product);
  openForm(editing ? "Editar producto" : "Nuevo producto", [
    { name: "name", label: "Nombre del producto", value: product?.name, required: true, full: true, maxLength: 100 },
    { name: "sku", label: "SKU", value: product?.sku, required: true, maxLength: 30 },
    { name: "category", label: "Categoría", type: "select", value: product?.category || data.categories[0], options: data.categories },
    { name: "detail", label: "Descripción breve", value: product?.detail || "", full: true, maxLength: 120 },
    { name: "price", label: "Precio (USD)", type: "number", value: product?.price ?? "", required: true, min: 0.01, step: "0.01" },
    { name: "stock", label: "Existencias", type: "number", value: product?.stock ?? 0, required: true, min: 0, step: "1" }
  ], (form) => {
    const name = String(form.get("name")).trim();
    const sku = String(form.get("sku")).trim();
    const price = Number(form.get("price"));
    const stock = Number(form.get("stock"));
    if (!name || !sku || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      showFormError("Completa el nombre y el SKU; el precio debe ser mayor que cero y el stock un entero no negativo.");
      return false;
    }
    if (data.products.some((item) => item.sku.toLocaleLowerCase(CONFIG.locale) === sku.toLocaleLowerCase(CONFIG.locale) && item.id !== product?.id)) {
      showFormError("Ya existe un producto con ese SKU.");
      return false;
    }
    if (product) {
      Object.assign(product, {
        name,
        sku,
        category: String(form.get("category")),
        detail: String(form.get("detail")).trim(),
        price,
        stock
      });
    } else {
      data.products.push({
        id: makeId("product"),
        name,
        sku,
        category: String(form.get("category")),
        detail: String(form.get("detail")).trim(),
        price,
        stock
      });
    }
    if (!saveData()) return false;
  });
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function openCategoryForm(category = null) {
  openForm(category ? "Editar categoría" : "Nueva categoría", [
    { name: "name", label: "Nombre de la categoría", value: category || "", required: true, maxLength: 50 }
  ], (form) => {
    const name = String(form.get("name")).trim();
    if (!name) {
      showFormError("Escribe un nombre de categoría.");
      return false;
    }
    if (data.categories.some((item) => item.toLocaleLowerCase(CONFIG.locale) === name.toLocaleLowerCase(CONFIG.locale) && item !== category)) {
      showFormError("Ya existe una categoría con ese nombre.");
      return false;
    }
    if (category) {
      data.categories = data.categories.map((item) => item === category ? name : item);
      data.products.forEach((product) => { if (product.category === category) product.category = name; });
    } else {
      data.categories.push(name);
    }
    if (!saveData()) return false;
  });
}

function openCustomerForm(customer = null) {
  openForm(customer ? "Editar cliente" : "Nuevo cliente", [
    { name: "name", label: "Nombre completo", value: customer?.name, required: true, full: true, maxLength: 100 },
    { name: "email", label: "Correo electrónico", type: "email", value: customer?.email || "", maxLength: 120 },
    { name: "phone", label: "Teléfono", type: "tel", value: customer?.phone || "", maxLength: 30 }
  ], (form) => {
    const name = String(form.get("name")).trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    if (!name) {
      showFormError("El nombre del cliente es obligatorio.");
      return false;
    }
    if (customer) Object.assign(customer, { name, email, phone });
    else data.customers.push({ id: makeId("customer"), name, email, phone });
    if (!saveData()) return false;
  });
}

function openAdminForm(admin = null) {
  openForm(admin ? "Editar administrador" : "Nuevo administrador", [
    { name: "name", label: "Nombre", value: admin?.name, required: true, full: true, maxLength: 100 },
    { name: "email", label: "Correo electrónico", type: "email", value: admin?.email, required: true, maxLength: 120, readOnly: admin?.id === "admin-demo" },
    { name: "role", label: "Rol", type: "select", value: admin?.role || CONFIG.adminRoles[0], options: CONFIG.adminRoles },
    { name: "active", label: "Estado", type: "select", value: admin?.active === false ? "Inactivo" : "Activo", options: ["Activo", "Inactivo"] }
  ], (form) => {
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLocaleLowerCase(CONFIG.locale);
    if (!name || !email) {
      showFormError("Completa el nombre y el correo electrónico.");
      return false;
    }
    if (data.admins.some((item) => item.email.toLocaleLowerCase(CONFIG.locale) === email && item.id !== admin?.id)) {
      showFormError("Ya existe un administrador con ese correo.");
      return false;
    }
    const active = form.get("active") === "Activo";
    if (admin) Object.assign(admin, { name, email, role: String(form.get("role")), active });
    else data.admins.push({ id: makeId("admin"), name, email, role: String(form.get("role")), active });
    if (!saveData()) return false;
  });
}

function openStockForm(product) {
  openForm("Ajustar existencias", [
    { name: "stock", label: `Stock físico · ${product.name}`, type: "number", value: product.stock, required: true, min: 0, step: "1" }
  ], (form) => {
    const stock = Number(form.get("stock"));
    if (!Number.isInteger(stock) || stock < 0) {
      showFormError("El stock debe ser un entero igual o mayor que cero.");
      return false;
    }
    product.stock = stock;
    if (!saveData()) return false;
  });
}

// Operaciones del punto de venta
function updateCart(productId, difference) {
  const product = data.products.find((item) => item.id === productId);
  const line = cart.find((item) => item.productId === productId);
  if (!product) return;
  const quantity = (line?.quantity || 0) + difference;
  if (quantity <= 0) cart = cart.filter((item) => item.productId !== productId);
  else if (quantity > product.stock) notify(`Existencias disponibles de ${product.name}: ${product.stock}.`, true);
  else if (line) line.quantity = quantity;
  else cart.push({ productId, quantity });
  render();
}

function completeSale() {
  if (!cart.length) return;
  for (const item of cart) {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    if (!product || item.quantity > product.stock) {
      notify("El inventario cambió; revisa las cantidades antes de confirmar la venta.", true);
      render();
      return;
    }
  }
  const customerId = pageContent.querySelector("[data-pos-customer]")?.value || "";
  const customer = data.customers.find((item) => item.id === customerId);
  const paymentMethod = pageContent.querySelector("[data-pos-payment]")?.value || CONFIG.paymentMethods[0];
  const items = cart.map((item) => {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.price,
      quantity: item.quantity
    };
  });
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  items.forEach((item) => {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    product.stock -= item.quantity;
  });
  const sale = {
    id: makeId("sale"),
    date: new Date().toISOString(),
    customerId: customer?.id || null,
    customerName: customer?.name || "",
    paymentMethod,
    items,
    total,
    status: SALE_STATUS.COMPLETED
  };
  data.sales.push(sale);
  if (!saveData()) return;
  cart = [];
  notify(`Venta confirmada por ${money(total)}. El stock fue actualizado.`);
  render();
}

// Cambios de inventario y eliminación con protección de relaciones.
function voidSale(saleId) {
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale || sale.status !== SALE_STATUS.COMPLETED) return;
  if (!window.confirm(`¿Anular la venta ${sale.id.slice(-8).toUpperCase()}? Se devolverán las unidades al inventario.`)) return;
  sale.items.forEach((item) => {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    if (product) product.stock += item.quantity;
  });
  sale.status = SALE_STATUS.VOIDED;
  sale.voidedAt = new Date().toISOString();
  if (!saveData()) return;
  notify("Venta anulada; las existencias se devolvieron al inventario.");
  render();
}

function deleteRecord(collection, id, label, beforeDelete) {
  const record = data[collection].find((item) => item.id === id);
  if (!record || !window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
  if (beforeDelete && !beforeDelete(record)) return;
  if (collection === "products" && data.sales.some((sale) =>
    sale.status === SALE_STATUS.COMPLETED && sale.items.some((item) => item.productId === id)
  )) {
    notify("No se puede eliminar un producto asociado a una venta vigente.", true);
    return;
  }
  if (collection === "products" && cart.some((item) => item.productId === id)) {
    notify("Quita el producto de la venta actual antes de eliminarlo.", true);
    return;
  }
  data[collection] = data[collection].filter((item) => item.id !== id);
  if (saveData()) {
    notify(`${label.charAt(0).toLocaleUpperCase(CONFIG.locale)}${label.slice(1)} eliminado.`);
    render();
  }
}

function deleteCategory(category) {
  if (data.products.some((product) => product.category === category)) {
    notify("No se puede eliminar una categoría que tiene productos asignados.", true);
    return;
  }
  if (!window.confirm(`¿Eliminar la categoría "${category}"?`)) return;
  data.categories = data.categories.filter((item) => item !== category);
  if (saveData()) render();
}

function filterVisibleTable(input) {
  const query = input.value.trim().toLocaleLowerCase(CONFIG.locale);
  const table = input.closest(".page-content")?.querySelector("tbody");
  if (!table) return;
  table.querySelectorAll("tr").forEach((row) => {
    row.hidden = !row.textContent.toLocaleLowerCase(CONFIG.locale).includes(query);
  });
}

// Delegación de eventos: los controles se vuelven a crear al renderizar las vistas.
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view], [data-action]");
  if (!target) return;
  if (target.dataset.view) {
    activeView = target.dataset.view;
    render();
    return;
  }
  const { action, id, entity } = target.dataset;
  switch (action) {
    case "logout":
      setSession(false);
      showLogin();
      break;
    case "pos":
      activeView = "pos";
      render();
      break;
    case "create-product":
      openProductForm();
      break;
    case "edit-product":
      openProductForm(data.products.find((item) => item.id === id));
      break;
    case "delete-product":
      deleteRecord("products", id, "producto");
      break;
    case "create-category":
      openCategoryForm();
      break;
    case "edit-category":
      openCategoryForm(id);
      break;
    case "delete-category":
      deleteCategory(id);
      break;
    case "create-customer":
      openCustomerForm();
      break;
    case "edit-customer":
      openCustomerForm(data.customers.find((item) => item.id === id));
      break;
    case "delete-customer":
      deleteRecord("customers", id, "cliente");
      break;
    case "create-admin":
      openAdminForm();
      break;
    case "edit-admin":
      openAdminForm(data.admins.find((item) => item.id === id));
      break;
    case "delete-admin":
      if (id === "admin-demo") notify("No se puede eliminar el usuario de acceso demo.", true);
      else deleteRecord("admins", id, "administrador");
      break;
    case "edit-stock":
      openStockForm(data.products.find((item) => item.id === id));
      break;
    case "pos-add":
      updateCart(id, 1);
      break;
    case "cart-increment":
      updateCart(id, 1);
      break;
    case "cart-decrement":
      updateCart(id, -1);
      break;
    case "cart-remove":
      cart = cart.filter((item) => item.productId !== id);
      render();
      break;
    case "checkout":
      completeSale();
      break;
    case "void-sale":
      voidSale(id);
      break;
    case "close-dialog":
      dialog.close();
      break;
    default:
      if (entity) notify(`Acción no disponible para ${entity}.`, true);
  }
});

document.querySelector("#logout-button").addEventListener("click", () => {
  setSession(false);
  showLogin();
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.matches("[data-filter-table]")) filterVisibleTable(input);
  if (input.matches("[data-pos-search]")) {
    const productGrid = pageContent.querySelector("[data-pos-products]");
    if (productGrid) drawPosProducts(productGrid);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-pos-customer]")) posCustomerId = event.target.value;
  if (event.target.matches("[data-pos-payment]")) posPaymentMethod = event.target.value;
});
