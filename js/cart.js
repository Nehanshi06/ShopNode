// ============================================================
// cart.js — Cart Management (shared across all pages)
// ============================================================

const CartManager = (() => {
  const CART_KEY = "shopnode_cart";
  const WISHLIST_KEY = "shopnode_wishlist";

  // --- Core CRUD ---
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: cart }));
  }

  function addItem(productId, quantity = 1) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock === 0) {
      showToast("This product is out of stock.", "error");
      return;
    }
    const cart = getCart();
    const existing = cart.find((i) => i.id === productId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        showToast(`Only ${product.stock} units available.`, "warning");
        existing.quantity = product.stock;
      } else {
        existing.quantity = newQty;
      }
    } else {
      cart.push({ id: productId, quantity });
    }
    saveCart(cart);
    showToast(`"${product.name}" added to cart!`, "success");
    // Refresh inline qty controls if on products page
    refreshCardQtyControl(productId);
  }

  function removeItem(productId) {
    const cart = getCart().filter((i) => i.id !== productId);
    saveCart(cart);
    refreshCardQtyControl(productId);
  }

  function updateQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find((i) => i.id === productId);
    if (!item) return;
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const product = PRODUCTS.find((p) => p.id === productId);
    item.quantity = Math.min(quantity, product.stock);
    saveCart(cart);
    refreshCardQtyControl(productId);
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: [] }));
  }

  function getItemCount() {
    return getCart().reduce((sum, i) => sum + i.quantity, 0);
  }

  function getItemQuantity(productId) {
    const cart = getCart();
    const item = cart.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  }

  // --- Calculations ---
  function calculateTotals() {
    const cart = getCart();
    let subtotal = 0;
    let discountTotal = 0;
    cart.forEach((item) => {
      const product = PRODUCTS.find((p) => p.id === item.id);
      if (!product) return;
      const originalTotal = product.price * item.quantity;
      const discountedTotal = getDiscountedPrice(product) * item.quantity;
      subtotal += discountedTotal;
      discountTotal += originalTotal - discountedTotal;
    });
    const shipping = subtotal >= APP_CONFIG.shipping.freeAbove ? 0 : APP_CONFIG.shipping.standard;
    const tax = Math.round(subtotal * APP_CONFIG.taxRate);
    const grandTotal = subtotal + shipping + tax;
    return { subtotal, discountTotal, shipping, tax, grandTotal };
  }

  // --- Wishlist ---
  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch {
      return [];
    }
  }

  function toggleWishlist(productId) {
    const wishlist = getWishlist();
    const idx = wishlist.indexOf(productId);
    if (idx > -1) {
      wishlist.splice(idx, 1);
      showToast("Removed from wishlist.", "info");
    } else {
      wishlist.push(productId);
      showToast("Added to wishlist!", "success");
    }
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    document.dispatchEvent(new CustomEvent("wishlistUpdated"));
    return idx === -1;
  }

  function isWishlisted(productId) {
    return getWishlist().includes(productId);
  }

  // --- UI Helpers ---
  function updateCartBadge() {
    const badges = document.querySelectorAll(".cart-badge");
    const count = getItemCount();
    badges.forEach((b) => {
      b.textContent = count;
      b.style.display = count > 0 ? "flex" : "none";
    });
  }

  return {
    getCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    getItemQuantity,
    calculateTotals,
    getWishlist,
    toggleWishlist,
    isWishlisted,
    updateCartBadge,
  };
})();

// ============================================================
// Inline Card Quantity Control (products page)
// ============================================================
function refreshCardQtyControl(productId) {
  const card = document.querySelector(`.product-card[data-id="${productId}"]`);
  if (!card) return;
  const footer = card.querySelector(".card-footer");
  if (!footer) return;
  const qty = CartManager.getItemQuantity(productId);
  if (qty > 0) {
    footer.innerHTML = `
      <div class="card-qty-control">
        <button class="card-qty-btn" onclick="cardQtyChange(${productId}, -1)" aria-label="Decrease quantity">−</button>
        <span class="card-qty-val">${qty}</span>
        <button class="card-qty-btn" onclick="cardQtyChange(${productId}, 1)" aria-label="Increase quantity">+</button>
      </div>`;
  } else {
    const product = PRODUCTS.find((p) => p.id === productId);
    const outOfStock = product && product.stock === 0;
    footer.innerHTML = `
      <button class="btn-add-cart${outOfStock ? " disabled" : ""}"
        onclick="${outOfStock ? "" : `cardAddToCart(${productId})`}"
        ${outOfStock ? "disabled" : ""} aria-label="Add to cart">
        ${outOfStock ? "Out of Stock" : "Add to Cart"}
      </button>`;
  }
}

function cardAddToCart(id) {
  CartManager.addItem(id);
  // refreshCardQtyControl is called inside addItem → saveCart → cartUpdated
}

function cardQtyChange(id, delta) {
  const current = CartManager.getItemQuantity(id);
  CartManager.updateQuantity(id, current + delta);
}

// ============================================================
// Toast Notifications (global)
// ============================================================
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ"}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================================
// Cart Page Renderer
// ============================================================
function renderCartPage() {
  const cartContainer = document.getElementById("cart-items");
  const emptyState = document.getElementById("cart-empty");
  const cartSummarySection = document.getElementById("cart-summary-section");
  if (!cartContainer) return;

  const cart = CartManager.getCart();
  CartManager.updateCartBadge();

  if (cart.length === 0) {
    cartContainer.innerHTML = "";
    emptyState && (emptyState.style.display = "flex");
    cartSummarySection && (cartSummarySection.style.display = "none");
    return;
  }

  emptyState && (emptyState.style.display = "none");
  cartSummarySection && (cartSummarySection.style.display = "block");

  cartContainer.innerHTML = cart
    .map((item) => {
      const p = PRODUCTS.find((pr) => pr.id === item.id);
      if (!p) return "";
      const discountedPrice = getDiscountedPrice(p);
      return `
      <div class="cart-item" data-id="${p.id}">
        <div class="cart-item-image">
          <img src="${p.image}" alt="${p.name}" loading="lazy" />
        </div>
        <div class="cart-item-info">
          <p class="cart-item-category">${p.category}</p>
          <h3 class="cart-item-name">${p.name}</h3>
          <p class="cart-item-brand">${p.brand}</p>
          <div class="cart-item-price-row">
            <span class="cart-item-price">${APP_CONFIG.currency}${discountedPrice.toLocaleString()}</span>
            ${p.discount > 0 ? `<span class="cart-item-original">${APP_CONFIG.currency}${p.price.toLocaleString()}</span><span class="cart-item-discount">-${p.discount}%</span>` : ""}
          </div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(${p.id}, -1)" aria-label="Decrease">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${p.id}, 1)" aria-label="Increase">+</button>
          </div>
          <p class="cart-item-total">${APP_CONFIG.currency}${(discountedPrice * item.quantity).toLocaleString()}</p>
          <button class="remove-btn" onclick="removeFromCart(${p.id})" aria-label="Remove item">🗑</button>
        </div>
      </div>`;
    })
    .join("");

  renderCartSummary();
}

function renderCartSummary() {
  const totals = CartManager.calculateTotals();
  const fmt = (n) => `${APP_CONFIG.currency}${n.toLocaleString()}`;
  document.getElementById("summary-subtotal") && (document.getElementById("summary-subtotal").textContent = fmt(totals.subtotal));
  document.getElementById("summary-discount") && (document.getElementById("summary-discount").textContent = `-${fmt(totals.discountTotal)}`);
  document.getElementById("summary-shipping") && (document.getElementById("summary-shipping").textContent = totals.shipping === 0 ? "FREE" : fmt(totals.shipping));
  document.getElementById("summary-tax") && (document.getElementById("summary-tax").textContent = fmt(totals.tax));
  document.getElementById("summary-total") && (document.getElementById("summary-total").textContent = fmt(totals.grandTotal));
}

function changeQty(id, delta) {
  const cart = CartManager.getCart();
  const item = cart.find((i) => i.id === id);
  if (item) CartManager.updateQuantity(id, item.quantity + delta);
  renderCartPage();
}

function removeFromCart(id) {
  CartManager.removeItem(id);
  renderCartPage();
  showToast("Item removed from cart.", "info");
}

// Init badge on every page load
document.addEventListener("DOMContentLoaded", () => CartManager.updateCartBadge());
