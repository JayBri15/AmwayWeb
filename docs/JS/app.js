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
const routeProductGrid = document.querySelector("#route-product-grid");
const searchInput = document.querySelector("#site-search");
const searchSuggestions = document.querySelector("#search-suggestions");
const cartKey = "amway-demo-cart-v1";
const categoryRoutes = [
  { hash: "#categoria-nutricion", category: "Nutrición", tileId: "categoria-nutricion" },
  { hash: "#categoria-belleza", category: "Belleza", tileId: "categoria-belleza" },
  { hash: "#categoria-cuidado", category: "Cuidado personal", tileId: "categoria-cuidado" },
  { hash: "#categoria-hogar", category: "En casa", tileId: "categoria-hogar" }
];
let activeCategory = "Todos";
let routeFilter = "Todos";
let currentRouteCategory = null;
let searchTerm = "";
let visibleSuggestions = [];
let activeSuggestionIndex = -1;
let preserveSearchOnRoute = false;
let cart = loadCart();

// Recupera el carrito guardado y descarta datos inválidos o productos inexistentes.
function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    return Array.isArray(savedCart)
      ? savedCart.filter((item) =>
          item !== null &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          products.some((product) => product.id === item.id) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
        )
      : [];
  } catch (error) {
    console.error("No se pudo recuperar el carrito guardado.", error);
    return [];
  }
}

// Persiste el estado actual del carrito en el navegador.
function saveCart() {
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch (error) {
    console.error("No se pudo guardar el carrito.", error);
  }
}

// Presenta los importes con formato de moneda en español y dólares.
function money(value) {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

// Filtra los productos por categoría y texto de búsqueda.
function getVisibleProducts(category) {
  return products.filter((product) => {
    const matchesCategory = category === "Todos" || product.category === category;
    const searchableText = `${product.name} ${product.category} ${product.detail}`.toLocaleLowerCase("es");
    return matchesCategory && searchableText.includes(searchTerm);
  });
}

// Construye y presenta coincidencias de búsqueda en la lista desplegable.
function renderSearchSuggestions() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  visibleSuggestions = query
    ? products.filter((product) => {
        const searchableText =
          `${product.name} ${product.category} ${product.detail}`.toLocaleLowerCase("es");
        return searchableText.includes(query);
      })
    : [];
  activeSuggestionIndex = -1;
  searchSuggestions.replaceChildren();

  visibleSuggestions.forEach((product) => {
    const option = document.createElement("button");
    option.type = "button";
    option.id = `search-option-${product.id}`;
    option.className = "search-suggestion";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.dataset.productId = product.id;

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = "";
    image.loading = "lazy";

    const copy = document.createElement("span");
    copy.className = "search-suggestion-copy";

    const name = document.createElement("strong");
    name.textContent = product.name;

    const description = document.createElement("span");
    description.textContent = `${product.category} · ${product.detail}`;

    const price = document.createElement("span");
    price.className = "search-suggestion-price";
    price.textContent = money(product.price);

    copy.append(name, description);
    option.append(image, copy, price);
    searchSuggestions.append(option);
  });

  const hasSuggestions = visibleSuggestions.length > 0;
  searchSuggestions.hidden = !hasSuggestions;
  searchInput.setAttribute("aria-expanded", String(hasSuggestions));
  searchInput.removeAttribute("aria-activedescendant");
}

// Cierra la lista de coincidencias y restablece el estado accesible.
function closeSearchSuggestions() {
  searchSuggestions.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
  searchInput.removeAttribute("aria-activedescendant");
  activeSuggestionIndex = -1;
  searchSuggestions.querySelectorAll(".search-suggestion").forEach((option) => {
    option.classList.remove("is-active");
    option.setAttribute("aria-selected", "false");
  });
}

// Selecciona un producto y abre el catálogo filtrado a esa coincidencia.
function selectSearchSuggestion(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  searchInput.value = product.name;
  searchTerm = product.name.toLocaleLowerCase("es");
  routeFilter = "Todos";
  activeCategory = "Todos";
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeCategory);
  });
  document.querySelectorAll("[data-route-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.routeFilter === routeFilter);
  });
  renderProducts();
  renderRouteProducts();
  closeSearchSuggestions();

  if (window.location.hash === "#todos-productos") {
    document.querySelector("#route-page").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    return;
  }

  preserveSearchOnRoute = true;
  window.location.hash = "#todos-productos";
}

// Ajusta la opción activa del listbox para la navegación por teclado.
function setActiveSearchSuggestion(index) {
  activeSuggestionIndex = index;
  const options = searchSuggestions.querySelectorAll(".search-suggestion");

  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === activeSuggestionIndex;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-selected", String(isActive));
  });

  const activeOption = options[activeSuggestionIndex];
  if (!activeOption) {
    searchInput.removeAttribute("aria-activedescendant");
    return;
  }

  searchInput.setAttribute("aria-activedescendant", activeOption.id);
  activeOption.scrollIntoView({ block: "nearest" });
}

// Genera el marcado de una lista de productos.
function productCardsMarkup(visibleProducts) {
  return visibleProducts
    .map((product, index) => `
      <article class="product-card" style="animation-delay:${index * 45}ms">
        <div class="product-image">
          <img
            src="${product.image}"
            alt="${product.name}"
            loading="lazy"
          >
          <span class="product-badge">${product.badge}</span>
        </div>
        <div class="product-info">
          <p class="product-category">${product.category} · ${product.detail}</p>
          <h3>${product.name}</h3>
          <div class="product-bottom">
            <span class="product-price">${money(product.price)}</span>
            <button
              class="add-to-cart"
              data-add="${product.id}"
              aria-label="Agregar ${product.name} al carrito"
            >+</button>
          </div>
        </div>
      </article>
    `)
    .join("");
}

// Actualiza una cuadrícula de productos y sus estados vacíos y de resultados.
function renderProductList(grid, count, emptyState, category) {
  const visibleProducts = getVisibleProducts(category);
  grid.innerHTML = productCardsMarkup(visibleProducts);
  emptyState.hidden = visibleProducts.length > 0;
  count.textContent = `${visibleProducts.length} productos`;
}

// Filtra el catálogo de la página principal.
function renderProducts() {
  renderProductList(
    productGrid,
    document.querySelector("#result-count"),
    document.querySelector("#empty-state"),
    activeCategory
  );
}

// Filtra el catálogo del módulo activo.
function renderRouteProducts() {
  renderProductList(
    routeProductGrid,
    document.querySelector("#route-result-count"),
    document.querySelector("#route-empty-state"),
    currentRouteCategory || routeFilter
  );
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
      <article class="cart-line">
        <img src="${product.image}" alt="" loading="lazy">
        <div>
          <h3>${product.name}</h3>
          <p>${money(product.price)} c/u</p>
          <div
            class="quantity-controls"
            aria-label="Cantidad de ${product.name}"
          >
            <button
              data-quantity="${product.id}"
              data-change="-1"
              aria-label="Quitar uno"
            >−</button>
            <span>${product.quantity}</span>
            <button
              data-quantity="${product.id}"
              data-change="1"
              aria-label="Agregar uno"
            >+</button>
          </div>
        </div>
        <span class="cart-line-price">${money(product.price * product.quantity)}</span>
      </article>
    `)
    .join("");

  document.querySelector("#cart-subtotal").textContent = money(
    items.reduce((sum, product) => sum + product.price * product.quantity, 0)
  );
}

// Añade una unidad del producto indicado y actualiza almacenamiento e interfaz.
function addToCart(productId) {
  const item = cart.find((entry) => entry.id === productId);

  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

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

// Cambia entre la tienda, las vistas por categoría, el catálogo y la cuenta.
function updateRoute() {
  closeSearchSuggestions();
  const hash = window.location.hash;
  const isAccountRoute = ["#iniciar-sesion", "#crear-cuenta"].includes(hash);
  const selectedCategory = categoryRoutes.find((route) => route.hash === hash);
  const isAllProductsRoute = hash === "#todos-productos";
  const isModuleRoute = Boolean(selectedCategory || isAllProductsRoute);

  document.querySelector("#storefront").hidden = isAccountRoute || isModuleRoute;
  document.querySelector("#account-page").hidden = !isAccountRoute;
  document.querySelector("#route-page").hidden = !isModuleRoute;

  if (isModuleRoute) {
    const routeTitle = document.querySelector("#route-title");
    const routeEyebrow = document.querySelector("#route-eyebrow");
    const routeSubcategories = document.querySelector("#route-subcategories");
    const routeFilterRow = document.querySelector("#route-filter-row");

    if (preserveSearchOnRoute && isAllProductsRoute) {
      preserveSearchOnRoute = false;
    } else {
      searchTerm = "";
      searchInput.value = "";
    }

    if (selectedCategory) {
      currentRouteCategory = selectedCategory.category;
      routeEyebrow.textContent = document.querySelector(".category-section .eyebrow").textContent;
      routeTitle.textContent = document.querySelector(
        `#${selectedCategory.tileId} .tile-content strong`
      ).textContent;

      const matchingSubcategory = [...document.querySelectorAll(".subcategory-list > div")]
        .find((subcategory) =>
          subcategory.querySelector("strong").textContent === selectedCategory.category
        );
      routeSubcategories.replaceChildren(matchingSubcategory.cloneNode(true));
      routeSubcategories.hidden = false;
      routeFilterRow.hidden = true;
    } else {
      currentRouteCategory = null;
      routeFilter = "Todos";
      activeCategory = "Todos";
      routeEyebrow.textContent = document.querySelector("#products-title")
        .previousElementSibling.textContent;
      routeTitle.innerHTML = document.querySelector("#products-title").innerHTML;
      routeSubcategories.replaceChildren();
      routeSubcategories.hidden = true;
      routeFilterRow.hidden = false;
      document.querySelectorAll("[data-route-filter]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.routeFilter === routeFilter);
      });
      document.querySelectorAll("[data-filter]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.filter === activeCategory);
      });
    }

    renderProducts();
    renderRouteProducts();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    return;
  }

  currentRouteCategory = null;
  if (!isAccountRoute) return;

  const isSignup = window.location.hash === "#crear-cuenta";
  const password = document.querySelector("#account-password");
  const form = document.querySelector("#account-form");
  form.reset();
  document.querySelector("#account-title").textContent = isSignup ? "Crear cuenta" : "Iniciar sesión";
  document.querySelector("#account-eyebrow").textContent = isSignup ? "Empieza algo bueno" : "Qué gusto tenerte aquí";
  document.querySelector("#account-intro").textContent = isSignup
    ? "Crea tu cuenta para descubrir todo lo que tenemos para ti."
    : "Ingresa a tu cuenta para continuar.";
  const submitLabel = isSignup ? "Crear cuenta" : "Iniciar sesión";
  document.querySelector("#account-submit").innerHTML =
    `${submitLabel} <span aria-hidden="true">→</span>`;
  document.querySelector("#account-switch").innerHTML = isSignup
    ? '¿Ya tienes una cuenta? <a href="#iniciar-sesion">Iniciar sesión</a>'
    : '¿No tienes una cuenta? <a href="#crear-cuenta">Crear cuenta</a>';
  document.querySelector("#password-rules").hidden = !isSignup;
  document.querySelector("#confirm-password-wrap").hidden = !isSignup;
  password.autocomplete = isSignup ? "new-password" : "current-password";
  document.querySelector("#form-message").textContent = "";
  document.querySelector("#form-message").classList.remove("is-success");
  document.querySelectorAll("#account-form input").forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
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
  document.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.classList.toggle("is-active", chip === button);
  });
  renderProducts();
});

document.querySelector("#route-filter-row").addEventListener("click", (event) => {
  const button = event.target.closest("[data-route-filter]");
  if (!button) return;

  routeFilter = button.dataset.routeFilter;
  document.querySelectorAll("[data-route-filter]").forEach((filterButton) => {
    filterButton.classList.toggle("is-active", filterButton === button);
  });
  renderRouteProducts();
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedProduct = visibleSuggestions[activeSuggestionIndex] || visibleSuggestions[0];
  if (selectedProduct) selectSearchSuggestion(selectedProduct.id);
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
  renderProducts();
  renderRouteProducts();
  renderSearchSuggestions();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && visibleSuggestions.length > 0) {
    event.preventDefault();
    const nextIndex = activeSuggestionIndex < visibleSuggestions.length - 1
      ? activeSuggestionIndex + 1
      : 0;
    setActiveSearchSuggestion(nextIndex);
  } else if (event.key === "ArrowUp" && visibleSuggestions.length > 0) {
    event.preventDefault();
    const previousIndex = activeSuggestionIndex > 0
      ? activeSuggestionIndex - 1
      : visibleSuggestions.length - 1;
    setActiveSearchSuggestion(previousIndex);
  } else if (event.key === "Enter" && visibleSuggestions.length > 0) {
    event.preventDefault();
    const selectedProduct = visibleSuggestions[activeSuggestionIndex] || visibleSuggestions[0];
    selectSearchSuggestion(selectedProduct.id);
  } else if (event.key === "Escape") {
    closeSearchSuggestions();
  }
});

searchSuggestions.addEventListener("click", (event) => {
  const option = event.target.closest("[data-product-id]");
  if (option) selectSearchSuggestion(option.dataset.productId);
});

document.addEventListener("click", (event) => {
  if (!document.querySelector("#search-form").contains(event.target)) {
    closeSearchSuggestions();
  }
});

// Eventos del carrito: agregar productos, ajustar cantidades y controlar el panel.
function handleProductGridClick(event) {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
}

productGrid.addEventListener("click", handleProductGridClick);
routeProductGrid.addEventListener("click", handleProductGridClick);

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
  const drawerIsOpen = document.querySelector("#cart-drawer").classList.contains("is-open");
  if (event.key === "Escape" && drawerIsOpen) closeCart();
});

// Eventos de cuenta: mostrar contraseña, indicar requisitos y validar campos.
document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    const showPassword = input.type === "password";
    input.type = showPassword ? "text" : "password";
    button.textContent = showPassword ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-label", `${showPassword ? "Ocultar" : "Mostrar"} contraseña`);
  });
});

document.querySelector("#account-password").addEventListener("input", (event) => {
  const rules = validPassword(event.target.value);
  Object.entries(rules).forEach(([rule, passed]) => {
    document.querySelector(`[data-rule="${rule}"]`).classList.toggle("is-valid", passed);
  });
});

document.querySelector("#account-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const isSignup = window.location.hash === "#crear-cuenta";
  const email = document.querySelector("#account-email");
  const password = document.querySelector("#account-password");
  const confirmation = document.querySelector("#confirm-password");
  const message = document.querySelector("#form-message");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
  const passwordValid = isSignup
    ? Object.values(validPassword(password.value)).every(Boolean)
    : password.value.length > 0;
  const confirmationValid = !isSignup || confirmation.value === password.value;

  email.setAttribute("aria-invalid", String(!emailValid));
  password.setAttribute("aria-invalid", String(!passwordValid));
  if (isSignup) {
    confirmation.setAttribute("aria-invalid", String(!confirmationValid));
  }

  if (!emailValid) {
    message.textContent = "Escribe un correo electrónico con formato válido.";
  } else if (!passwordValid) {
    message.textContent = "La contraseña debe incluir 8 caracteres, mayúscula, minúscula, número y símbolo.";
  } else if (!confirmationValid) {
    message.textContent = "Las contraseñas no coinciden.";
  } else if (isSignup) {
    message.textContent =
      "Datos validados en esta página. Para crear y activar tu cuenta " +
      "falta conectar el servicio de cuentas y enviar la verificación al correo.";
  } else {
    message.textContent =
      "Formulario validado. Para iniciar sesión, esta página necesita " +
      "conectarse a un servicio de autenticación.";
  }

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