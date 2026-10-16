import React from "react";
import { createRoot } from "react-dom/client";
import "../CSS/app.css";
import { Storefront } from "./pages/Storefront.jsx";
import { Checkout } from "./pages/Checkout.jsx";
import { Admin } from "./pages/Admin.jsx";

// Selecciona una pantalla React a partir del parámetro de URL, sin duplicar HTML.
const page = new URLSearchParams(window.location.search).get("page");

const application =
  page === "checkout" ? <Checkout /> : page === "admin" ? <Admin /> : <Storefront />;

// Monta la pantalla elegida en el único punto de entrada HTML del sitio.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>{application}</React.StrictMode>
);
