// Referencias y estado compartido de la tienda.
let products = window.amwayProducts;
let categories = window.amwayCategories;
const productGrid = document.querySelector("#product-grid");
const routeProductGrid = document.querySelector("#route-product-grid");
const searchInput = document.querySelector("#site-search");
const searchSuggestions = document.querySelector("#search-suggestions");
const cartKey = "amway-demo-cart-v1";
const legacyCategoryRoutes = {
  "Nutrición": "#categoria-nutricion",
  "Belleza": "#categoria-belleza",
  "Cuidado personal": "#categoria-cuidado",
  "En casa": "#categoria-hogar"
};
const categoryTileStyles = [
  { tile: "nutrition-tile", art: "art-nutrition", symbol: "❋" },
  { tile: "beauty-tile", art: "art-beauty", symbol: "⟡" },
  { tile: "care-tile", art: "art-care", symbol: "✺" },
  { tile: "home-tile", art: "art-home", symbol: "⌂" }
];
let categoryRoutes = [];
let activeCategory = "Todos";
let routeFilter = "Todos";
let currentRouteCategory = null;
let activeSubcategory = null;
let searchTerm = "";
let visibleSuggestions = [];
let activeSuggestionIndex = -1;
let preserveSearchOnRoute = false;
let cart = loadCart();

// Recupera el carrito y armoniza cantidades con el catálogo compartido actual.
function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    return window.normalizeAmwayCart(savedCart);
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function categoryRouteHash(category) {
  return legacyCategoryRoutes[category] || `#categoria-${encodeURIComponent(category)}`;
}

function renderCategoryControls() {
  categoryRoutes = categories.map((category) => ({
    hash: categoryRouteHash(category),
    category
  }));

  const categoryNav = document.querySelector("#category-nav");
  const allProductsLink = categoryNav.querySelector(".all-products-link");
  categoryNav.querySelectorAll("[data-category-link]").forEach((link) => link.remove());
  categories.forEach((category) => {
    const link = document.createElement("a");
    link.href = categoryRouteHash(category);
    link.dataset.categoryLink = category;
    link.textContent = category;
    categoryNav.insertBefore(link, allProductsLink);
  });

  const categoryGrid = document.querySelector("#category-grid");
  categoryGrid.replaceChildren();
  categories.forEach((category, index) => {
    const style = categoryTileStyles[index % categoryTileStyles.length];
    const categoryProducts = products.filter((product) => product.category === category);
    const description = [...new Set(categoryProducts.map((product) => product.detail).filter(Boolean))]
      .slice(0, 2)
      .join(" · ") || "Explora nuestra selección";
    const tile = document.createElement("a");
    tile.className = `category-tile ${style.tile}`;
    tile.href = categoryRouteHash(category);
    tile.dataset.category = category;
    const number = document.createElement("span");
    number.className = "tile-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const art = document.createElement("span");
    art.className = `tile-art ${style.art}`;
    art.setAttribute("aria-hidden", "true");
    art.textContent = style.symbol;
    const content = document.createElement("span");
    content.className = "tile-content";
    content.append(
      Object.assign(document.createElement("strong"), { textContent: category }),
      Object.assign(document.createElement("small"), { textContent: description })
    );
    const arrow = document.createElement("span");
    arrow.className = "tile-arrow";
    arrow.textContent = "→";
    tile.append(number, art, content, arrow);
    categoryGrid.append(tile);
  });

  const subcategoryList = document.querySelector("#subcategory-list");
  subcategoryList.replaceChildren();
  categories.forEach((category) => {
    const details = [...new Set(
      products
        .filter((product) => product.category === category && product.detail)
        .map((product) => product.detail)
    )];
    if (!details.length) return;

    const group = document.createElement("div");
    group.dataset.category = category;
    const heading = document.createElement("strong");
    heading.textContent = category;
    group.append(heading);
    details.forEach((detail) => {
      const button = document.createElement("button");
      button.className = "subcategory-chip";
      button.type = "button";
      button.dataset.subcategory = detail;
      button.setAttribute("aria-pressed", "false");
      button.textContent = detail;
      group.append(button);
    });
    subcategoryList.append(group);
  });

  ["#filter-row", "#route-filter-row"].forEach((selector) => {
    const row = document.querySelector(selector);
    const isRouteRow = selector === "#route-filter-row";
    const attribute = isRouteRow ? "data-route-filter" : "data-filter";
    row.querySelectorAll(`[${attribute}]`).forEach((button) => {
      if (button.dataset[isRouteRow ? "routeFilter" : "filter"] !== "Todos") button.remove();
    });
    const count = row.querySelector(".result-count");
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.className = "filter-chip";
      button.dataset[isRouteRow ? "routeFilter" : "filter"] = category;
      button.textContent = category;
      button.classList.toggle(
        "is-active",
        (isRouteRow ? routeFilter : activeCategory) === category
      );
      row.insertBefore(button, count);
    });
  });
  document.querySelector(".category-section").hidden = categories.length === 0;
}

// Filtra los productos por categoría y texto de búsqueda.
function getVisibleProducts(category, subcategory = null) {
  return products.filter((product) => {
    const matchesCategory = category === "Todos" || product.category === category;
    const matchesSubcategory = !subcategory ||
      product.detail.toLocaleLowerCase("es") === subcategory.toLocaleLowerCase("es");
    const searchableText = `${product.name} ${product.category} ${product.detail}`.toLocaleLowerCase("es");
    return matchesCategory && matchesSubcategory && searchableText.includes(searchTerm);
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
  activeSubcategory = null;
  syncSubcategoryButtons();
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
    .map((product, index) => {
      const outOfStock = product.stock <= 0;
      const badge = outOfStock
        ? "Agotado"
        : product.stock <= 5
          ? "Pocas unidades"
          : product.badge;
      return `
      <article class="product-card" style="animation-delay:${index * 45}ms">
        <div class="product-image">
          <img
            src="${escapeHtml(product.image)}"
            alt="${escapeHtml(product.name)}"
            loading="lazy"
          >
          <span class="product-badge">${escapeHtml(badge)}</span>
        </div>
        <div class="product-info">
          <p class="product-category">${escapeHtml(product.category)} · ${escapeHtml(product.detail)}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="product-sku">SKU: ${escapeHtml(product.sku)}</p>
          <p class="product-stock">${
            outOfStock ? "Agotado" : `${product.stock} unidades disponibles`
          }</p>
          <div class="product-bottom">
            <span class="product-price">${money(product.price)}</span>
            <button
              class="add-to-cart"
              data-add="${escapeHtml(product.id)}"
              aria-label="${outOfStock ? "Producto agotado" : `Agregar ${escapeHtml(product.name)} al carrito`}"
              ${outOfStock ? "disabled" : ""}
            >+</button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
}

// Actualiza una cuadrícula de productos y sus estados vacíos y de resultados.
function renderProductList(grid, count, emptyState, category, subcategory = null) {
  const visibleProducts = getVisibleProducts(category, subcategory);
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
    activeCategory,
    activeSubcategory && activeSubcategory.category === activeCategory
      ? activeSubcategory.name
      : null
  );
}

// Filtra el catálogo del módulo activo.
function renderRouteProducts() {
  renderProductList(
    routeProductGrid,
    document.querySelector("#route-result-count"),
    document.querySelector("#route-empty-state"),
    currentRouteCategory || routeFilter,
    activeSubcategory &&
      activeSubcategory.category === (currentRouteCategory || routeFilter)
      ? activeSubcategory.name
      : null
  );
}

function syncSubcategoryButtons() {
  document.querySelectorAll(".subcategory-list [data-subcategory]").forEach((button) => {
    const group = button.closest("[data-category]");
    const isActive = activeSubcategory &&
      activeSubcategory.category === group.dataset.category &&
      activeSubcategory.name === button.dataset.subcategory;
    button.classList.toggle("is-active", Boolean(isActive));
    button.setAttribute("aria-pressed", String(Boolean(isActive)));
  });
}

function selectSubcategory(button, isRouteSubcategory) {
  const group = button.closest("[data-category]");
  if (!group) return;

  const isAlreadySelected = activeSubcategory &&
    activeSubcategory.category === group.dataset.category &&
    activeSubcategory.name === button.dataset.subcategory;
  activeCategory = group.dataset.category;
  activeSubcategory = isAlreadySelected
    ? null
    : { category: group.dataset.category, name: button.dataset.subcategory };
  document.querySelectorAll("[data-filter]").forEach((filterButton) => {
    filterButton.classList.toggle("is-active", filterButton.dataset.filter === activeCategory);
  });
  document.querySelectorAll("[data-route-filter]").forEach((filterButton) => {
    filterButton.classList.toggle("is-active", filterButton.dataset.routeFilter === activeCategory);
  });
  syncSubcategoryButtons();
  renderProducts();
  renderRouteProducts();

  if (isRouteSubcategory) {
    document.querySelector("#route-product-grid").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } else {
    document.querySelector("#catalogo").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
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
    .map((product) => {
      const safeId = escapeHtml(product.id);
      const safeName = escapeHtml(product.name);
      return `
      <article class="cart-line">
        <img src="${escapeHtml(product.image)}" alt="" loading="lazy">
        <div>
          <h3>${safeName}</h3>
          <p>${money(product.price)} c/u</p>
          <div
            class="quantity-controls"
            aria-label="Cantidad de ${safeName}"
          >
            <button
              data-quantity="${safeId}"
              data-change="-1"
              aria-label="Quitar uno"
            >−</button>
            <span>${product.quantity}</span>
            <button
              data-quantity="${safeId}"
              data-change="1"
              ${product.quantity >= product.stock ? "disabled" : ""}
              aria-label="Agregar uno"
            >+</button>
          </div>
        </div>
        <div class="cart-line-actions">
          <span class="cart-line-price">${money(product.price * product.quantity)}</span>
          <button
            class="cart-remove-button"
            type="button"
            data-remove-from-cart="${safeId}"
            aria-label="Eliminar ${safeName} del carrito"
            title="Eliminar producto"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"></path>
            </svg>
          </button>
        </div>
      </article>
    `;
    })
    .join("");

  document.querySelector("#cart-subtotal").textContent = money(
    items.reduce((sum, product) => sum + product.price * product.quantity, 0)
  );
}

// Añade una unidad del producto indicado y actualiza almacenamiento e interfaz.
function addToCart(productId) {
  const product = products.find((entry) => entry.id === productId);
  if (!product || product.stock <= 0) return;

  const item = cart.find((entry) => entry.id === productId);

  if (item) {
    if (item.quantity >= product.stock) return;
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
      if (activeSubcategory && activeSubcategory.category !== selectedCategory.category) {
        activeSubcategory = null;
      }
      activeCategory = selectedCategory.category;
      routeEyebrow.textContent = document.querySelector(".category-section .eyebrow").textContent;
      routeTitle.textContent = selectedCategory.category;

      const matchingSubcategory = [...document.querySelectorAll(".subcategory-list > div")]
        .find((subcategory) =>
          subcategory.querySelector("strong").textContent === selectedCategory.category
        );
      if (matchingSubcategory) {
        routeSubcategories.replaceChildren(matchingSubcategory.cloneNode(true));
        routeSubcategories.hidden = false;
      } else {
        routeSubcategories.replaceChildren();
        routeSubcategories.hidden = true;
      }
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
      activeSubcategory = null;
      document.querySelectorAll("[data-route-filter]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.routeFilter === routeFilter);
      });
      document.querySelectorAll("[data-filter]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.filter === activeCategory);
      });
    }

    syncSubcategoryButtons();
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
  activeSubcategory = null;
  syncSubcategoryButtons();
  document.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.classList.toggle("is-active", chip === button);
  });
  renderProducts();
});

document.querySelector("#route-filter-row").addEventListener("click", (event) => {
  const button = event.target.closest("[data-route-filter]");
  if (!button) return;

  routeFilter = button.dataset.routeFilter;
  activeSubcategory = null;
  document.querySelectorAll("[data-route-filter]").forEach((filterButton) => {
    filterButton.classList.toggle("is-active", filterButton === button);
  });
  syncSubcategoryButtons();
  renderProducts();
  renderRouteProducts();
});

document.querySelectorAll(".subcategory-list").forEach((list) => {
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-subcategory]");
    if (!button) return;
    selectSubcategory(button, list.id === "route-subcategories");
  });
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
  const removeButton = event.target.closest("[data-remove-from-cart]");
  if (removeButton) {
    cart = cart.filter((entry) => entry.id !== removeButton.dataset.removeFromCart);
    saveCart();
    renderCart();
    return;
  }

  const button = event.target.closest("[data-quantity]");
  if (!button) return;

  const item = cart.find((entry) => entry.id === button.dataset.quantity);
  if (!item) return;

  const product = products.find((entry) => entry.id === item.id);
  if (!product) return;
  if (Number(button.dataset.change) > 0 && item.quantity >= product.stock) return;

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

// Redirige al checkout independiente conservando el carrito guardado.
document.querySelector("#checkout-button").addEventListener("click", () => {
  if (cart.length === 0) return;

  closeCart();
  window.location.href = "Checkout.html";
});

// Mantiene la vista alineada con la ruta y dibuja el estado inicial de la tienda.
window.addEventListener("hashchange", updateRoute);
window.addEventListener("storage", (event) => {
  if (event.key === cartKey) {
    cart = loadCart();
    renderCart();
    return;
  }
  if (event.key !== "amway-admin-demo-data-v1" && event.key !== null) return;

  window.refreshAmwayCatalog();
  products = window.amwayProducts;
  categories = window.amwayCategories;
  categoryRoutes = [];
  if (activeCategory !== "Todos" && !categories.includes(activeCategory)) {
    activeCategory = "Todos";
  }
  if (routeFilter !== "Todos" && !categories.includes(routeFilter)) {
    routeFilter = "Todos";
  }
  if (
    activeSubcategory &&
    !products.some((product) =>
      product.category === activeSubcategory.category &&
      product.detail === activeSubcategory.name
    )
  ) {
    activeSubcategory = null;
  }
  cart = loadCart();
  saveCart();
  renderCategoryControls();
  renderProducts();
  renderRouteProducts();
  renderCart();
  updateRoute();
});
renderCategoryControls();
renderProducts();
renderCart();
updateRoute();