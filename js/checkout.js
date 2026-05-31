// ============================================================
// checkout.js — Multi-Step Checkout Process
// ============================================================

let currentStep = 1;
const TOTAL_STEPS = 5;
let orderData = {
  shipping: {},
  delivery: "standard",
  payment: "cod",
};

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("checkout-steps")) return;
  loadCheckoutCart();
  showStep(1);
  CartManager.updateCartBadge();
});

// ============================================================
// Step Navigation
// ============================================================
function showStep(step) {
  currentStep = step;
  document.querySelectorAll(".checkout-step").forEach((s) => s.classList.remove("active"));
  document.getElementById(`step-${step}`)?.classList.add("active");

  document.querySelectorAll(".step-indicator").forEach((el, idx) => {
    el.classList.remove("active", "completed");
    if (idx + 1 < step) el.classList.add("completed");
    else if (idx + 1 === step) el.classList.add("active");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function nextStep() {
  if (currentStep === 1 && !validateShipping()) return;
  if (currentStep < TOTAL_STEPS) {
    if (currentStep === 3) savePaymentData();
    if (currentStep === 4) renderOrderReview();
    showStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) showStep(currentStep - 1);
}

// ============================================================
// Step 1: Shipping Validation
// ============================================================
function validateShipping() {
  const fields = [
    { id: "ship-name", label: "Full Name", minLen: 3 },
    { id: "ship-email", label: "Email", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "ship-phone", label: "Mobile Number", pattern: /^[6-9]\d{9}$/ },
    { id: "ship-address", label: "Address", minLen: 10 },
    { id: "ship-city", label: "City", minLen: 2 },
    { id: "ship-state", label: "State", minLen: 2 },
    { id: "ship-pin", label: "PIN Code", pattern: /^\d{6}$/ },
  ];

  let valid = true;
  fields.forEach((f) => {
    const el = document.getElementById(f.id);
    const errEl = document.getElementById(`${f.id}-err`);
    if (!el) return;
    const val = el.value.trim();
    let msg = "";
    if (!val) {
      msg = `${f.label} is required.`;
    } else if (f.pattern && !f.pattern.test(val)) {
      msg = `Please enter a valid ${f.label}.`;
    } else if (f.minLen && val.length < f.minLen) {
      msg = `${f.label} must be at least ${f.minLen} characters.`;
    }
    if (msg) {
      el.classList.add("input-error");
      if (errEl) errEl.textContent = msg;
      valid = false;
    } else {
      el.classList.remove("input-error");
      if (errEl) errEl.textContent = "";
    }
  });

  if (valid) {
    orderData.shipping = {
      name: document.getElementById("ship-name").value.trim(),
      email: document.getElementById("ship-email").value.trim(),
      phone: document.getElementById("ship-phone").value.trim(),
      address: document.getElementById("ship-address").value.trim(),
      city: document.getElementById("ship-city").value.trim(),
      state: document.getElementById("ship-state").value.trim(),
      pin: document.getElementById("ship-pin").value.trim(),
    };
  }
  return valid;
}

// Real-time validation
document.addEventListener("DOMContentLoaded", () => {
  ["ship-name","ship-email","ship-phone","ship-address","ship-city","ship-state","ship-pin"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { el.classList.remove("input-error"); const errEl = document.getElementById(`${id}-err`); if (errEl) errEl.textContent = ""; });
  });
});

// ============================================================
// Step 2: Delivery
// ============================================================
function selectDelivery(type) {
  orderData.delivery = type;
  document.querySelectorAll(".delivery-option").forEach((o) => o.classList.remove("selected"));
  document.querySelector(`.delivery-option[data-type="${type}"]`)?.classList.add("selected");
}

// ============================================================
// Step 3: Payment
// ============================================================
function selectPayment(method) {
  orderData.payment = method;
  document.querySelectorAll(".payment-option").forEach((o) => o.classList.remove("selected"));
  document.querySelector(`.payment-option[data-method="${method}"]`)?.classList.add("selected");
  document.querySelectorAll(".payment-details").forEach((d) => d.classList.remove("active"));
  document.getElementById(`pay-details-${method}`)?.classList.add("active");
}

function savePaymentData() {
  if (orderData.payment === "card" || orderData.payment === "debit") {
    orderData.cardData = {
      number: document.getElementById("card-number")?.value || "****",
      name: document.getElementById("card-name")?.value || "",
      expiry: document.getElementById("card-expiry")?.value || "",
    };
  }
  if (orderData.payment === "upi") {
    orderData.upiId = document.getElementById("upi-id")?.value || "";
  }
}

// ============================================================
// Step 4: Order Review
// ============================================================
function renderOrderReview() {
  const cart = CartManager.getCart();
  const totals = CartManager.calculateTotals();
  const deliveryCost = orderData.delivery === "express" ? APP_CONFIG.shipping.express : (totals.subtotal >= APP_CONFIG.shipping.freeAbove ? 0 : APP_CONFIG.shipping.standard);
  const fmt = (n) => `${APP_CONFIG.currency}${n.toLocaleString()}`;

  // Items
  const itemsContainer = document.getElementById("review-items");
  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map((item) => {
      const p = PRODUCTS.find((pr) => pr.id === item.id);
      if (!p) return "";
      const dp = getDiscountedPrice(p);
      return `<div class="review-item">
        <img src="${p.image}" alt="${p.name}" />
        <div class="review-item-info">
          <p class="review-item-name">${p.name}</p>
          <p class="review-item-meta">${p.brand} · Qty: ${item.quantity}</p>
        </div>
        <span class="review-item-price">${fmt(dp * item.quantity)}</span>
      </div>`;
    }).join("");
  }

  // Address
  const addrEl = document.getElementById("review-address");
  if (addrEl && orderData.shipping.name) {
    const s = orderData.shipping;
    addrEl.innerHTML = `<strong>${s.name}</strong><br>${s.address}<br>${s.city}, ${s.state} - ${s.pin}<br>📞 ${s.phone}`;
  }

  // Delivery
  const delEl = document.getElementById("review-delivery");
  if (delEl) delEl.textContent = orderData.delivery === "express" ? "Express Delivery (1-2 days)" : "Standard Delivery (3-5 days)";

  // Payment
  const payEl = document.getElementById("review-payment");
  const payLabels = { cod: "Cash on Delivery", upi: "UPI", card: "Credit Card", debit: "Debit Card" };
  if (payEl) payEl.textContent = payLabels[orderData.payment] || orderData.payment;

  // Cost summary
  const finalSubtotal = totals.subtotal;
  const finalTax = Math.round(finalSubtotal * APP_CONFIG.taxRate);
  const finalTotal = finalSubtotal + deliveryCost + finalTax;
  const el = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  el("review-subtotal", fmt(finalSubtotal));
  el("review-discount", `-${fmt(totals.discountTotal)}`);
  el("review-shipping", deliveryCost === 0 ? "FREE" : fmt(deliveryCost));
  el("review-tax", fmt(finalTax));
  el("review-total", fmt(finalTotal));
}

// ============================================================
// Step 5: Place Order & Confirmation
// ============================================================
function placeOrder() {
  const btn = document.getElementById("place-order-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Processing…";
  }

  // Simulate network delay
  setTimeout(() => {
    const orderId = "NX" + Date.now().toString().slice(-8).toUpperCase();
    const delivery = orderData.delivery === "express" ? 2 : 5;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + delivery);
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const formattedDate = deliveryDate.toLocaleDateString("en-IN", options);

    document.getElementById("confirm-order-id") && (document.getElementById("confirm-order-id").textContent = orderId);
    document.getElementById("confirm-delivery-date") && (document.getElementById("confirm-delivery-date").textContent = formattedDate);
    document.getElementById("confirm-email") && (document.getElementById("confirm-email").textContent = orderData.shipping.email);

    CartManager.clearCart();
    showStep(5);
    launchConfetti();
  }, 1500);
}

// ============================================================
// Confetti animation
// ============================================================
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    r: Math.random() * 8 + 4,
    color: ["#e63946","#2a9d8f","#e9c46a","#264653","#f4a261"][Math.floor(Math.random() * 5)],
    speed: Math.random() * 3 + 2,
    angle: Math.random() * 6,
    spin: (Math.random() - 0.5) * 0.2,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 2.5);
      ctx.restore();
      p.y += p.speed;
      p.x += Math.sin(p.angle) * 1.5;
      p.angle += p.spin;
    });
    frame++;
    if (frame < 180) requestAnimationFrame(draw);
    else canvas.style.display = "none";
  }
  draw();
}

// ============================================================
// Load cart items in checkout sidebar
// ============================================================
function loadCheckoutCart() {
  const cart = CartManager.getCart();
  const container = document.getElementById("checkout-cart-items");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p class="empty-checkout">Your cart is empty. <a href="products.html">Shop now</a></p>`;
    return;
  }

  container.innerHTML = cart.map((item) => {
    const p = PRODUCTS.find((pr) => pr.id === item.id);
    if (!p) return "";
    const dp = getDiscountedPrice(p);
    return `<div class="checkout-cart-item">
      <img src="${p.image}" alt="${p.name}" />
      <div>
        <p class="co-item-name">${p.name}</p>
        <p class="co-item-qty">Qty: ${item.quantity} × ${APP_CONFIG.currency}${dp.toLocaleString()}</p>
      </div>
      <span class="co-item-total">${APP_CONFIG.currency}${(dp * item.quantity).toLocaleString()}</span>
    </div>`;
  }).join("");

  const totals = CartManager.calculateTotals();
  const fmt = (n) => `${APP_CONFIG.currency}${n.toLocaleString()}`;
  const el = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  el("co-subtotal", fmt(totals.subtotal));
  el("co-tax", fmt(totals.tax));
  el("co-shipping", totals.shipping === 0 ? "FREE" : fmt(totals.shipping));
  el("co-total", fmt(totals.grandTotal));
}

// UPI Format
document.addEventListener("input", (e) => {
  if (e.target.id === "card-number") {
    e.target.value = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  }
  if (e.target.id === "card-expiry") {
    e.target.value = e.target.value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "$1/$2").slice(0, 5);
  }
});
