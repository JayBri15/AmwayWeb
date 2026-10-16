// Fuente inicial del catálogo que comparten la tienda, el checkout y Admin.
window.amwayProducts = [
  {
    id: "nutrilite-daily",
    name: "Nutrilite Daily",
    sku: "NUT-001",
    category: "Nutrición",
    detail: "Vitaminas y suplementos",
    price: 28.5,
    stock: 24,
    badge: "Favorito",
    image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "artistry-skin",
    name: "Artistry Skin Nutrition",
    sku: "ART-001",
    category: "Belleza",
    detail: "Cuidado de la piel",
    price: 42,
    stock: 14,
    badge: "Nuevo",
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "body-series",
    name: "Geles de baño Body Series",
    sku: "BODY-001",
    category: "Cuidado personal",
    detail: "Baño y cuidado del cuerpo",
    price: 16.75,
    stock: 18,
    badge: "Esencial",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "dish-drops",
    name: "Concentrado Dish Drops",
    sku: "HOME-001",
    category: "En casa",
    detail: "Artículos de limpieza",
    price: 12.9,
    stock: 31,
    badge: "Concentrado",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "protein",
    name: "Nutrilite All Plant Protein",
    sku: "NUT-002",
    category: "Nutrición",
    detail: "Nutrición deportiva",
    price: 35.5,
    stock: 9,
    badge: "Nuevo",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "artistry-lip",
    name: "Artistry Go Vibrant",
    sku: "ART-002",
    category: "Belleza",
    detail: "Maquillaje",
    price: 24,
    stock: 11,
    badge: "Color nuevo",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "glister",
    name: "Pasta dental Glister",
    sku: "CARE-001",
    category: "Cuidado personal",
    detail: "Cuidado bucal",
    price: 9.5,
    stock: 27,
    badge: "Diario",
    image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "e-spring",
    name: "Sistema eSpring",
    sku: "HOME-002",
    category: "En casa",
    detail: "Tratamiento de agua",
    price: 289,
    stock: 4,
    badge: "Hogar",
    image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=700&q=80"
  }
];

const defaultProducts = window.amwayProducts.map((product) => ({ ...product }));
const defaultCategories = [...new Set(defaultProducts.map((product) => product.category))];

window.amwayCategories = [...defaultCategories];

// Valida la imagen antes de usarla en vistas que crean elementos del catálogo.
window.isValidAmwayImageSource = (image) => {
  if (typeof image !== "string" || !image) return false;
  if (
    image.length <= 3 * 1024 * 1024 &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
  ) {
    return true;
  }
  try {
    return ["http:", "https:"].includes(new URL(image).protocol);
  } catch {
    return false;
  }
}

// Consolida líneas duplicadas y mantiene las cantidades dentro del inventario actual.
window.normalizeAmwayCart = (cart) => {
  if (!Array.isArray(cart)) {
    throw new TypeError("El formato del carrito no es válido.");
  }

  const quantities = new Map();
  for (const item of cart) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      continue;
    }

    const product = window.amwayProducts.find((candidate) => candidate.id === item.id);
    if (!product || product.stock <= 0) continue;
    quantities.set(item.id, Math.min(
      product.stock,
      (quantities.get(item.id) || 0) + item.quantity
    ));
  }

  return [...quantities].map(([id, quantity]) => ({ id, quantity }));
};

// Lee y valida el catálogo persistido; si falta, restaura los datos de demostración.
window.refreshAmwayCatalog = () => {
  try {
    const storedData = localStorage.getItem("amway-admin-demo-data-v1");
    if (!storedData) {
      window.amwayProducts.splice(0, window.amwayProducts.length, ...defaultProducts);
      window.amwayCategories = [...defaultCategories];
      return;
    }

    const adminData = JSON.parse(storedData);
    if (
      !adminData ||
      !Array.isArray(adminData.products) ||
      !Array.isArray(adminData.categories) ||
      !adminData.categories.every((category) =>
        typeof category === "string" && category.trim().length > 0
      ) ||
      new Set(adminData.categories.map((category) => category.toLocaleLowerCase("es-MX"))).size !==
        adminData.categories.length
    ) {
      throw new TypeError("El catálogo de administración no tiene un formato válido.");
    }

    const defaultProductById = new Map(defaultProducts.map((product) => [product.id, product]));
    const products = adminData.products.map((product) => {
      const isValidProduct = product &&
        typeof product.id === "string" &&
        product.id.trim().length > 0 &&
        typeof product.name === "string" &&
        product.name.trim().length > 0 &&
        typeof product.sku === "string" &&
        product.sku.trim().length > 0 &&
        typeof product.category === "string" &&
        adminData.categories.includes(product.category) &&
        typeof product.detail === "string" &&
        Number.isFinite(product.price) &&
        product.price > 0 &&
        Number.isInteger(product.stock) &&
        product.stock >= 0 &&
        (product.image === undefined || window.isValidAmwayImageSource(product.image));
      if (!isValidProduct) {
        throw new TypeError(`El producto ${product?.id || "(sin identificador)"} no es válido.`);
      }
      return product;
    });
    if (
      new Set(products.map((product) => product.id)).size !== products.length ||
      new Set(products.map((product) => product.sku.toLocaleLowerCase("es-MX"))).size !== products.length
    ) {
      throw new TypeError("El catálogo contiene identificadores o SKU duplicados.");
    }

    const normalizedProducts = products.map((product) => {
      const defaults = defaultProductById.get(product.id);
      let image = defaults?.image || "";
      if (product.image) {
        if (product.image.startsWith("data:")) {
          image = product.image;
        } else {
          image = new URL(product.image).href;
        }
      }
      return {
        ...defaults,
        ...product,
        badge: defaults?.badge || product.badge || "Nuevo",
        image
      };
    });

    window.amwayProducts.splice(0, window.amwayProducts.length, ...normalizedProducts);
    window.amwayCategories = [...adminData.categories];
  } catch (error) {
    console.error("No se pudo recuperar el catálogo de administración.", error);
  }
};

window.refreshAmwayCatalog();
