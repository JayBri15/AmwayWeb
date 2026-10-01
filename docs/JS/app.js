// Datos estáticos que alimentan el catálogo y el carrito.
const products = [
  {
    id: "nutrilite-daily",
    name: "Nutrilite Daily",
    category: "Nutrición",
    detail: "Vitaminas y suplementos",
    price: 28.5,
    badge: "Favorito",
    image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "artistry-skin",
    name: "Artistry Skin Nutrition",
    category: "Belleza",
    detail: "Cuidado de la piel",
    price: 42,
    badge: "Nuevo",
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "body-series",
    name: "Geles de baño Body Series",
    category: "Cuidado personal",
    detail: "Baño y cuidado del cuerpo",
    price: 16.75,
    badge: "Esencial",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "dish-drops",
    name: "Concentrado Dish Drops",
    category: "En casa",
    detail: "Artículos de limpieza",
    price: 12.9,
    badge: "Concentrado",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "protein",
    name: "Nutrilite All Plant Protein",
    category: "Nutrición",
    detail: "Nutrición deportiva",
    price: 35.5,
    badge: "Nuevo",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "artistry-lip",
    name: "Artistry Go Vibrant",
    category: "Belleza",
    detail: "Maquillaje",
    price: 24,
    badge: "Color nuevo",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "glister",
    name: "Pasta dental Glister",
    category: "Cuidado personal",
    detail: "Cuidado bucal",
    price: 9.5,
    badge: "Diario",
    image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "e-spring",
    name: "Sistema eSpring",
    category: "En casa",
    detail: "Tratamiento de agua",
    price: 289,
    badge: "Hogar",
    image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=700&q=80"
  }
];

// Referencias y estado compartido de la tienda.
const productGrid = document.querySelector("#product-grid");
const cartKey = "amway-demo-cart-v1";
let activeCategory = "Todos";
let searchTerm = "";
let cart = loadCart();

// Recupera el carrito guardado y descarta datos inválidos o productos inexistentes.
function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    return Array.isArray(savedCart)
      ? savedCart.filter((item) =>
          products.some((product) => product.id === item.id) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
        )
      : [];
  } catch {
    return [];
  }
}

// Persiste el estado actual del carrito en el navegador.
function saveCart() {
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch {
    return;
  }
}

// Presenta los importes con formato de moneda en español y dólares.
function money(value) {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

// Filtra el catálogo por categoría y texto, y actualiza la lista visible.
function renderProducts() {
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
    const searchableText = `${product.name} ${product.category} ${product.detail}`.toLocaleLowerCase("es");
    return matchesCategory && searchableText.includes(searchTerm);
  });

  productGrid.innerHTML = visibleProducts
    .map((product, index) => `
      <article class="product-card" style="animation-delay:${index * 45}ms">
        <div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"><span class="product-badge">${product.badge}</span></div>
        <div class="product-info"><p class="product-category">${product.category} · ${product.detail}</p><h3>${product.name}</h3><div class="product-bottom"><span class="product-price">${money(product.price)}</span><button class="add-to-cart" data-add="${product.id}" aria-label="Agregar ${product.name} al carrito">+</button></div></div>
      </article>`)
    .join("");

  document.querySelector("#empty-state").hidden = visibleProducts.length > 0;
  document.querySelector("#result-count").textContent = `${visibleProducts.length} productos`;
}

// Sincroniza el contador, las líneas y el subtotal del carrito en pantalla.
function renderCart() {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  document.querySelector("#cart-count").textContent = itemCount;
  document.querySelector("#cart-open").setAttribute("aria-label", `Abrir carrito, ${itemCount} productos`);
  document.querySelector("#drawer-count").textContent = `(${itemCount})`;

  const items = cart.map((item) => ({
    ...products.find((product) => product.id === item.id),
    quantity: item.quantity
  }));

  document.querySelector("#cart-empty").hidden = items.length > 0;
  document.querySelector("#drawer-footer").hidden = items.length === 0;
  document.querySelector("#cart-items").innerHTML = items
    .map((product) => `
      <article class="cart-line"><img src="${product.image}" alt="" loading="lazy"><div><h3>${product.name}</h3><p>${money(product.price)} c/u</p><div class="quantity-controls" aria-label="Cantidad de ${product.name}"><button data-quantity="${product.id}" data-change="-1" aria-label="Quitar uno">−</button><span>${product.quantity}</span><button data-quantity="${product.id}" data-change="1" aria-label="Agregar uno">+</button></div></div><span class="cart-line-price">${money(product.price * product.quantity)}</span></article>`)
    .join("");

  document.querySelector("#cart-subtotal").textContent = money(
    items.reduce((sum, product) => sum + product.price * product.quantity, 0)
  );
}

// Añade una unidad del producto indicado y actualiza almacenamiento e interfaz.
function addToCart(productId) {
  const item = cart.find((entry) => entry.id === productId);

  if (item) item.quantity += 1;
  else cart.push({ id: productId, quantity: 1 });

  saveCart();
  renderCart();
}

// Muestra el panel lateral y mueve el foco al botón para cerrarlo.
function openCart() {
  const drawer = document.querySelector("#cart-drawer");
  document.querySelector("#drawer-backdrop").hidden = false;
  drawer.inert = false;
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  requestAnimationFrame(() => drawer.classList.add("is-open"));
  document.querySelector("#cart-close").focus();
}

// Oculta el panel lateral y devuelve el foco al botón que lo abre.
function closeCart() {
  const drawer = document.querySelector("#cart-drawer");
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  document.querySelector("#drawer-backdrop").hidden = true;
  document.body.classList.remove("drawer-open");
  document.querySelector("#cart-open").focus();
}

// Cambia entre la tienda y las vistas de inicio de sesión o registro.
function updateRoute() {
  const isAccountRoute = ["#iniciar-sesion", "#crear-cuenta"].includes(window.location.hash);
  document.querySelector("#storefront").hidden = isAccountRoute;
  document.querySelector("#account-page").hidden = !isAccountRoute;
  if (!isAccountRoute) return;

  const isSignup = window.location.hash === "#crear-cuenta";
  const password = document.querySelector("#account-password");
  const form = document.querySelector("#account-form");
  form.reset();
  document.querySelector("#account-title").textContent = isSignup ? "Crear cuenta" : "Iniciar sesión";
  document.querySelector("#account-eyebrow").textContent = isSignup ? "Empieza algo bueno" : "Qué gusto tenerte aquí";
  document.querySelector("#account-intro").textContent = isSignup ? "Crea tu cuenta para descubrir todo lo que tenemos para ti." : "Ingresa a tu cuenta para continuar.";
  document.querySelector("#account-submit").innerHTML = `${isSignup ? "Crear cuenta" : "Iniciar sesión"} <span aria-hidden="true">→</span>`;
  document.querySelector("#account-switch").innerHTML = isSignup ? '¿Ya tienes una cuenta? <a href="#iniciar-sesion">Iniciar sesión</a>' : '¿No tienes una cuenta? <a href="#crear-cuenta">Crear cuenta</a>';
  document.querySelector("#password-rules").hidden = !isSignup;
  document.querySelector("#confirm-password-wrap").hidden = !isSignup;
  password.autocomplete = isSignup ? "new-password" : "current-password";
  document.querySelector("#form-message").textContent = "";
  document.querySelector("#form-message").classList.remove("is-success");
  document.querySelectorAll("#account-form input").forEach((input) => input.removeAttribute("aria-invalid"));
}

// Devuelve el resultado de cada requisito de contraseña del formulario.
function validPassword(value) {
  return {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value)
  };
}

// Eventos del catálogo: filtros, búsqueda, categorías y reinicio de filtros.
document.querySelector("#filter-row").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  activeCategory = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
  renderProducts();
});

document.querySelector("#search-form").addEventListener("submit", (event) => event.preventDefault());
document.querySelector("#site-search").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLocaleLowerCase("es");
  renderProducts();
  if (searchTerm) document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector(".category-grid").addEventListener("click", (event) => {
  const link = event.target.closest("[data-category]");
  if (!link) return;

  activeCategory = link.dataset.category;
  document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.filter === activeCategory));
  renderProducts();
});

document.querySelector("#clear-filter").addEventListener("click", () => {
  activeCategory = "Todos";
  searchTerm = "";
  document.querySelector("#site-search").value = "";
  document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.filter === "Todos"));
  renderProducts();
});

// Eventos del carrito: agregar productos, ajustar cantidades y controlar el panel.
productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});

document.querySelector("#cart-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity]");
  if (!button) return;

  const item = cart.find((entry) => entry.id === button.dataset.quantity);
  if (!item) return;

  item.quantity += Number(button.dataset.change);
  cart = cart.filter((entry) => entry.quantity > 0);
  saveCart();
  renderCart();
});

document.querySelector("#cart-open").addEventListener("click", openCart);
document.querySelector("#cart-close").addEventListener("click", closeCart);
document.querySelector("#drawer-backdrop").addEventListener("click", closeCart);
document.querySelector("#empty-cart-link").addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector("#cart-drawer").classList.contains("is-open")) closeCart();
});

// Eventos de cuenta: mostrar contraseña, indicar requisitos y validar campos.
document.querySelectorAll(".password-toggle").forEach((button) => button.addEventListener("click", () => {
  const input = document.getElementById(button.dataset.target);
  const showPassword = input.type === "password";
  input.type = showPassword ? "text" : "password";
  button.textContent = showPassword ? "Ocultar" : "Mostrar";
  button.setAttribute("aria-label", `${showPassword ? "Ocultar" : "Mostrar"} contraseña`);
}));

document.querySelector("#account-password").addEventListener("input", (event) => {
  const rules = validPassword(event.target.value);
  Object.entries(rules).forEach(([rule, passed]) => document.querySelector(`[data-rule="${rule}"]`).classList.toggle("is-valid", passed));
});

document.querySelector("#account-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const isSignup = window.location.hash === "#crear-cuenta";
  const email = document.querySelector("#account-email");
  const password = document.querySelector("#account-password");
  const confirmation = document.querySelector("#confirm-password");
  const message = document.querySelector("#form-message");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
  const passwordValid = isSignup ? Object.values(validPassword(password.value)).every(Boolean) : password.value.length > 0;
  const confirmationValid = !isSignup || confirmation.value === password.value;

  email.setAttribute("aria-invalid", String(!emailValid));
  password.setAttribute("aria-invalid", String(!passwordValid));
  if (isSignup) confirmation.setAttribute("aria-invalid", String(!confirmationValid));

  if (!emailValid) message.textContent = "Escribe un correo electrónico con formato válido.";
  else if (!passwordValid) message.textContent = "La contraseña debe incluir 8 caracteres, mayúscula, minúscula, número y símbolo.";
  else if (!confirmationValid) message.textContent = "Las contraseñas no coinciden.";
  else if (isSignup) message.textContent = "Datos validados en esta página. Para crear y activar tu cuenta falta conectar el servicio de cuentas y enviar la verificación al correo.";
  else message.textContent = "Formulario validado. Para iniciar sesión, esta página necesita conectarse a un servicio de autenticación.";

  message.classList.toggle("is-success", emailValid && passwordValid && confirmationValid);
});

// El proceso de compra solicita autenticación y cierra el panel del carrito.
document.querySelector("#checkout-button").addEventListener("click", () => {
  window.location.hash = "#iniciar-sesion";
  closeCart();
});

// Mantiene la vista alineada con la ruta y dibuja el estado inicial de la tienda.
window.addEventListener("hashchange", updateRoute);
renderProducts();
renderCart();
updateRoute();