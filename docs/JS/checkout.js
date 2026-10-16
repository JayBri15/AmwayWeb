const cartKey = "amway-demo-cart-v1";
const products = window.amwayProducts;
const checkoutTitle = document.querySelector("#checkout-title");
let checkoutStep = "review";

// Recupera el carrito con cantidades consolidadas y limitadas al inventario vigente.
function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    return window.normalizeAmwayCart(savedCart);
  } catch (error) {
    console.error("No se pudo recuperar el carrito guardado.", error);
    return [];
  }
}

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

// Guarda los cambios y avisa al usuario si el almacenamiento local no está disponible.
function saveCart(cart) {
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    document.querySelector("#checkout-cart-message").hidden = true;
    return true;
  } catch (error) {
    console.error("No se pudo actualizar el carrito.", error);
    const message = document.querySelector("#checkout-cart-message");
    message.textContent = "No se pudo guardar el cambio. Inténtalo de nuevo.";
    message.hidden = false;
    return false;
  }
}

function renderCheckout() {
  const cart = loadCart();
  const items = cart.map((item) => ({
    ...products.find((product) => product.id === item.id),
    quantity: item.quantity
  }));
  const subtotal = items.reduce((sum, product) => sum + product.price * product.quantity, 0);
  const itemCount = items.reduce((sum, product) => sum + product.quantity, 0);
  const hasItems = items.length > 0;

  document.querySelector("#checkout-items").innerHTML = items
    .map((product) => {
      const safeId = escapeHtml(product.id);
      const safeName = escapeHtml(product.name);
      return `
      <article class="checkout-item">
        <img src="${escapeHtml(product.image)}" alt="" loading="lazy">
        <div>
          <h3>${safeName}</h3>
          <p class="checkout-item-unit-price">${money(product.price)} c/u</p>
          <div class="checkout-quantity-controls" aria-label="Cantidad de ${safeName}">
            <button
              class="checkout-quantity-button"
              type="button"
              data-cart-action="decrease"
              data-product-id="${safeId}"
              aria-label="Quitar una unidad de ${safeName}"
              ${product.quantity === 1 ? "disabled" : ""}
            >−</button>
            <span aria-label="Cantidad: ${product.quantity}">${product.quantity}</span>
            <button
              class="checkout-quantity-button"
              type="button"
              data-cart-action="increase"
              data-product-id="${safeId}"
              aria-label="Agregar una unidad de ${safeName}"
              ${product.quantity >= product.stock ? "disabled" : ""}
            >+</button>
          </div>
        </div>
        <div class="checkout-item-actions">
          <strong>${money(product.price * product.quantity)}</strong>
          <button
            class="checkout-remove-button"
            type="button"
            data-cart-action="remove"
            data-product-id="${safeId}"
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
  document.querySelector("#checkout-subtotal").textContent = money(subtotal);
  document.querySelector("#checkout-total").textContent = money(subtotal);
  document.querySelector("#checkout-final-count").textContent = String(itemCount);
  document.querySelector("#checkout-final-subtotal").textContent = money(subtotal);
  document.querySelector("#checkout-empty").hidden = hasItems;
  document.querySelector("#checkout-review-content").hidden = !hasItems;
  document.querySelector("#checkout-confirm-area").hidden = !hasItems;
  document.querySelector("#checkout-continue").disabled =
    !hasItems || !document.querySelector("#checkout-confirmation").checked;
  document.querySelector("#payment-final-count").textContent = String(itemCount);
  document.querySelector("#payment-final-subtotal").textContent = money(subtotal);

  document.querySelector("#checkout-review").hidden = checkoutStep !== "review";
  document.querySelector("#checkout-address").hidden =
    checkoutStep !== "address" || !hasItems;
  document.querySelector("#checkout-payment").hidden =
    checkoutStep !== "payment" || !hasItems;
  const stepContent = {
    review: {
      title: "Revisa tu selección",
      intro: "Confirma tus artículos y el resumen de cobro antes de ingresar tus datos de entrega."
    },
    address: {
      title: "Dirección de entrega",
      intro: "Ingresa y confirma la dirección donde recibirás tu compra."
    },
    payment: {
      title: "Método y datos de pago",
      intro: "Selecciona un método de pago e ingresa los datos necesarios para completar tu compra."
    }
  }[checkoutStep];
  checkoutTitle.textContent = stepContent.title;
  document.querySelector("#checkout-intro").textContent = stepContent.intro;
  document.querySelectorAll("[data-checkout-progress]").forEach((step) => {
    const isActive = step.dataset.checkoutProgress === checkoutStep;
    step.classList.toggle("is-active", isActive);
    if (isActive) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }
  });
}

document.querySelector("#checkout-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;

  const cart = loadCart();
  const productIndex = cart.findIndex((item) => item.id === button.dataset.productId);
  if (productIndex === -1) return;

  if (button.dataset.cartAction === "increase") {
    const product = products.find((entry) => entry.id === cart[productIndex].id);
    if (!product || cart[productIndex].quantity >= product.stock) return;
    cart[productIndex].quantity += 1;
  } else if (button.dataset.cartAction === "decrease") {
    if (cart[productIndex].quantity <= 1) return;
    cart[productIndex].quantity -= 1;
  } else if (button.dataset.cartAction === "remove") {
    cart.splice(productIndex, 1);
  } else {
    return;
  }

  if (!saveCart(cart)) return;

  document.querySelector("#checkout-confirmation").checked = false;
  renderCheckout();
});

document.querySelector("#checkout-confirmation").addEventListener("change", (event) => {
  document.querySelector("#checkout-continue").disabled =
    !event.target.checked || loadCart().length === 0;
});

document.querySelector("#checkout-continue").addEventListener("click", () => {
  if (!document.querySelector("#checkout-confirmation").checked || loadCart().length === 0) return;

  checkoutStep = "address";
  renderCheckout();
  checkoutTitle.focus();
});

document.querySelector("#address-form").addEventListener("submit", (event) => {
  event.preventDefault();
  checkoutStep = "payment";
  renderCheckout();
  checkoutTitle.focus();
});

document.querySelector("#checkout-back-to-review").addEventListener("click", () => {
  checkoutStep = "review";
  renderCheckout();
  checkoutTitle.focus();
});

document.querySelector("#checkout-back-to-address").addEventListener("click", () => {
  checkoutStep = "address";
  renderCheckout();
  checkoutTitle.focus();
});

const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]');
const cardFields = document.querySelector("#payment-card-fields");
const cardInputs = cardFields.querySelectorAll("input");
const cardExpiryInput = document.querySelector("#card-expiry");

cardExpiryInput.addEventListener("input", () => {
  const cursorPosition = cardExpiryInput.selectionStart;
  const digitsBeforeCursor = cardExpiryInput.value
    .slice(0, cursorPosition)
    .replace(/\D/g, "").length;
  const digits = cardExpiryInput.value.replace(/\D/g, "").slice(0, 4);
  const formattedValue = digits.length >= 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
  const formattedCursorPosition = Math.min(
    digitsBeforeCursor + (digitsBeforeCursor >= 2 ? 1 : 0),
    formattedValue.length
  );

  cardExpiryInput.value = formattedValue;
  cardExpiryInput.setSelectionRange(formattedCursorPosition, formattedCursorPosition);
});

paymentMethodInputs.forEach((input) => {
  input.addEventListener("change", (event) => {
    const cardSelected = event.target.value === "card";
    cardFields.hidden = !cardSelected;
    cardInputs.forEach((field) => {
      field.required = cardSelected;
    });
  });
});

document.querySelector("#payment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.querySelector("#checkout-message");
  message.textContent =
    "Datos validados en este prototipo. No se guardaron ni enviaron datos y no se realizó ningún cobro.";
  message.classList.add("is-success");
});

// Actualiza el resumen si otra pestaña cambia el catálogo, inventario o carrito.
window.addEventListener("storage", (event) => {
  if (
    event.key !== "amway-admin-demo-data-v1" &&
    event.key !== cartKey &&
    event.key !== null
  ) {
    return;
  }

  if (event.key !== cartKey) window.refreshAmwayCatalog();
  document.querySelector("#checkout-confirmation").checked = false;
  if (loadCart().length === 0) checkoutStep = "review";
  renderCheckout();
});

renderCheckout();
