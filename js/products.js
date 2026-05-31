// ============================================================
// products.js — Product Listing, Filtering, Sorting, Search
// ============================================================

let filteredProducts = [...PRODUCTS];
let activeFilters = {
  categories: [],
  brands: [],
  priceMin: 0,
  priceMax: Infinity,
  rating: 0,
  inStockOnly: false,
};
let currentSort = "popularity";
let currentPage = 1;
const ITEMS_PER_PAGE = 12;
let searchQuery = "";
let debounceTimer = null;

// ============================================================
// Initialise Products Page
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("product-grid")) return;
  buildFilterSidebar();
  buildSortDropdown();
  setupSearch();
  applyFiltersAndSort();
  renderActiveFilterTags();

  // URL params support
  const params = new URLSearchParams(window.location.search);
  if (params.get("category")) {
    const cat = params.get("category");
    activeFilters.categories = [cat];
    const cb = document.querySelector(`.filter-cb[data-category="${cat}"]`);
    if (cb) cb.checked = true;
    applyFiltersAndSort();
    renderActiveFilterTags();
  }
  if (params.get("q")) {
    searchQuery = params.get("q");
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = searchQuery;
    applyFiltersAndSort();
  }
});

// ============================================================
// Filter Sidebar Builder
// ============================================================
function buildFilterSidebar() {
  // Categories
  const catContainer = document.getElementById("filter-categories");
  if (catContainer) {
    catContainer.innerHTML = CATEGORIES.map(
      (cat) => `
      <label class="filter-option">
        <input type="checkbox" class="filter-cb" data-type="category" data-category="${cat}" onchange="onCategoryChange(this)" />
        <span class="filter-label">${cat}</span>
        <span class="filter-count">${PRODUCTS.filter((p) => p.category === cat).length}</span>
      </label>`
    ).join("");
  }

  // Brands
  const brandContainer = document.getElementById("filter-brands");
  if (brandContainer) {
    brandContainer.innerHTML = BRANDS.map(
      (brand) => `
      <label class="filter-option">
        <input type="checkbox" class="filter-cb" data-type="brand" data-brand="${brand}" onchange="onBrandChange(this)" />
        <span class="filter-label">${brand}</span>
        <span class="filter-count">${PRODUCTS.filter((p) => p.brand === brand).length}</span>
      </label>`
    ).join("");
  }

  // Price range
  const prices = PRODUCTS.map((p) => getDiscountedPrice(p));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceSlider = document.getElementById("price-max-slider");
  const priceLabel = document.getElementById("price-label");
  if (priceSlider) {
    priceSlider.min = minPrice;
    priceSlider.max = maxPrice;
    priceSlider.value = maxPrice;
    priceLabel.textContent = `Up to ${APP_CONFIG.currency}${maxPrice.toLocaleString()}`;
    priceSlider.addEventListener("input", function () {
      activeFilters.priceMax = parseInt(this.value);
      priceLabel.textContent = `Up to ${APP_CONFIG.currency}${parseInt(this.value).toLocaleString()}`;
      debouncedApply();
    });
  }

  // Rating
  const ratingContainer = document.getElementById("filter-rating");
  if (ratingContainer) {
    ratingContainer.innerHTML = [4, 3, 2].map(
      (r) => `
      <label class="filter-option">
        <input type="radio" name="rating" value="${r}" onchange="onRatingChange(${r})" />
        <span class="filter-label stars-gold">${"★".repeat(r)}${"☆".repeat(5 - r)} & up</span>
      </label>`
    ).join(`
      <label class="filter-option">
        <input type="radio" name="rating" value="0" checked onchange="onRatingChange(0)" />
        <span class="filter-label">All ratings</span>
      </label>`);
  }
}

function onCategoryChange(el) {
  const cat = el.dataset.category;
  if (el.checked) {
    if (!activeFilters.categories.includes(cat)) activeFilters.categories.push(cat);
  } else {
    activeFilters.categories = activeFilters.categories.filter((c) => c !== cat);
  }
  currentPage = 1;
  applyFiltersAndSort();
  renderActiveFilterTags();
}

function onBrandChange(el) {
  const brand = el.dataset.brand;
  if (el.checked) {
    if (!activeFilters.brands.includes(brand)) activeFilters.brands.push(brand);
  } else {
    activeFilters.brands = activeFilters.brands.filter((b) => b !== brand);
  }
  currentPage = 1;
  applyFiltersAndSort();
  renderActiveFilterTags();
}

function onRatingChange(r) {
  activeFilters.rating = r;
  currentPage = 1;
  applyFiltersAndSort();
  renderActiveFilterTags();
}

function toggleInStock() {
  const cb = document.getElementById("in-stock-toggle");
  activeFilters.inStockOnly = cb ? cb.checked : false;
  currentPage = 1;
  applyFiltersAndSort();
  renderActiveFilterTags();
}

// ============================================================
// Sort Dropdown
// ============================================================
function buildSortDropdown() {
  const select = document.getElementById("sort-select");
  if (!select) return;
  select.addEventListener("change", function () {
    currentSort = this.value;
    currentPage = 1;
    applyFiltersAndSort();
  });
}

// ============================================================
// Search
// ============================================================
function setupSearch() {
  const input = document.getElementById("search-input");
  const suggestBox = document.getElementById("search-suggestions");
  if (!input) return;

  input.addEventListener("input", function () {
    searchQuery = this.value.trim().toLowerCase();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 1;
      applyFiltersAndSort();
      renderSuggestions(this.value.trim());
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      suggestBox && (suggestBox.style.display = "none");
    }
    if (e.key === "Enter") {
      suggestBox && (suggestBox.style.display = "none");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      suggestBox && (suggestBox.style.display = "none");
    }
  });
}

function renderSuggestions(query) {
  const suggestBox = document.getElementById("search-suggestions");
  if (!suggestBox || !query) {
    suggestBox && (suggestBox.style.display = "none");
    return;
  }
  const matches = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  if (matches.length === 0) {
    suggestBox.style.display = "none";
    return;
  }

  suggestBox.innerHTML = matches
    .map((p) => {
      const highlight = (text) => text.replace(new RegExp(`(${query})`, "gi"), "<mark>$1</mark>");
      return `<div class="suggestion-item" onclick="selectSuggestion('${p.name.replace(/'/g, "\\'")}')">
        <img src="${p.image}" alt="" />
        <div>
          <p class="sug-name">${highlight(p.name)}</p>
          <p class="sug-cat">${p.category} · ${p.brand}</p>
        </div>
        <span class="sug-price">${APP_CONFIG.currency}${getDiscountedPrice(p).toLocaleString()}</span>
      </div>`;
    })
    .join("");
  suggestBox.style.display = "block";
}

function selectSuggestion(name) {
  const input = document.getElementById("search-input");
  const suggestBox = document.getElementById("search-suggestions");
  if (input) input.value = name;
  searchQuery = name.toLowerCase();
  suggestBox && (suggestBox.style.display = "none");
  currentPage = 1;
  applyFiltersAndSort();
}

// ============================================================
// Core Filter + Sort Logic
// ============================================================
function applyFiltersAndSort() {
  // Filter
  filteredProducts = PRODUCTS.filter((p) => {
    if (activeFilters.categories.length && !activeFilters.categories.includes(p.category)) return false;
    if (activeFilters.brands.length && !activeFilters.brands.includes(p.brand)) return false;
    const dp = getDiscountedPrice(p);
    if (dp < activeFilters.priceMin || dp > activeFilters.priceMax) return false;
    if (p.rating < activeFilters.rating) return false;
    if (activeFilters.inStockOnly && p.stock === 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        !p.brand.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Sort
  filteredProducts.sort((a, b) => {
    switch (currentSort) {
      case "price-asc": return getDiscountedPrice(a) - getDiscountedPrice(b);
      case "price-desc": return getDiscountedPrice(b) - getDiscountedPrice(a);
      case "rating": return b.rating - a.rating;
      case "popularity": return b.popularity - a.popularity;
      case "newest": return a.daysOld - b.daysOld;
      case "az": return a.name.localeCompare(b.name);
      case "za": return b.name.localeCompare(a.name);
      default: return 0;
    }
  });

  updateResultCount();
  renderProducts();
  renderPagination();
}

function debouncedApply() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFiltersAndSort, 200);
}

// ============================================================
// Render Products Grid
// ============================================================
function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageProducts = filteredProducts.slice(start, start + ITEMS_PER_PAGE);

  if (pageProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search query.</p>
        <button class="btn-primary" onclick="clearAllFilters()">Clear Filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = pageProducts.map((p) => buildProductCard(p)).join("");

  // Intersection Observer for lazy load animations
  const cards = grid.querySelectorAll(".product-card");
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.1 }
  );
  cards.forEach((c) => observer.observe(c));

  updateWishlistIcons();
}

function buildProductCard(p) {
  const dp = getDiscountedPrice(p);
  const isWished = CartManager.isWishlisted(p.id);
  const outOfStock = p.stock === 0;
  return `
  <article class="product-card${outOfStock ? " out-of-stock" : ""}" data-id="${p.id}" role="article" aria-label="${p.name}">
    ${p.discount > 0 ? `<span class="badge badge-discount">-${p.discount}%</span>` : ""}
    ${outOfStock ? `<span class="badge badge-oos">Out of Stock</span>` : ""}
    <button class="wishlist-btn${isWished ? " wished" : ""}" onclick="toggleWish(${p.id}, this)" aria-label="${isWished ? "Remove from" : "Add to"} wishlist">
      ${isWished ? "♥" : "♡"}
    </button>
    <div class="card-image-wrap">
      <img src="${p.image}" alt="${p.name}" loading="lazy" class="card-img" />
      <button class="quick-view-btn" onclick="openQuickView(${p.id})" aria-label="Quick view ${p.name}">Quick View</button>
    </div>
    <div class="card-body">
      <p class="card-category">${p.category}</p>
      <h3 class="card-name">${highlightSearch(p.name)}</h3>
      <p class="card-brand">${p.brand}</p>
      <div class="card-rating" aria-label="Rating: ${p.rating} out of 5">
        <span class="stars">${getStarHTML(p.rating)}</span>
        <span class="rating-num">${p.rating}</span>
        <span class="review-count">(${p.reviews.toLocaleString()})</span>
      </div>
      <div class="card-price-row">
        <span class="card-price">${APP_CONFIG.currency}${dp.toLocaleString()}</span>
        ${p.discount > 0 ? `<span class="card-original">${APP_CONFIG.currency}${p.price.toLocaleString()}</span>` : ""}
      </div>
    </div>
    <div class="card-footer">
      <button class="btn-add-cart${outOfStock ? " disabled" : ""}" 
        onclick="${outOfStock ? "" : `addToCartFromCard(${p.id})`}" 
        ${outOfStock ? "disabled" : ""} aria-label="Add ${p.name} to cart">
        ${outOfStock ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>
  </article>`;
}

function highlightSearch(text) {
  if (!searchQuery) return text;
  return text.replace(new RegExp(`(${searchQuery})`, "gi"), "<mark>$1</mark>");
}

function addToCartFromCard(id) {
  CartManager.addItem(id);
}

function toggleWish(id, btn) {
  const added = CartManager.toggleWishlist(id);
  btn.textContent = added ? "♥" : "♡";
  btn.classList.toggle("wished", added);
}

function updateWishlistIcons() {
  document.querySelectorAll(".wishlist-btn").forEach((btn) => {
    const id = parseInt(btn.closest(".product-card").dataset.id);
    const wished = CartManager.isWishlisted(id);
    btn.textContent = wished ? "♥" : "♡";
    btn.classList.toggle("wished", wished);
  });
}

// ============================================================
// Quick View Modal
// ============================================================
function openQuickView(id) {
  const p = PRODUCTS.find((pr) => pr.id === id);
  if (!p) return;
  const dp = getDiscountedPrice(p);
  const modal = document.getElementById("quick-view-modal");
  document.getElementById("qv-image").src = p.image;
  document.getElementById("qv-image").alt = p.name;
  document.getElementById("qv-category").textContent = p.category;
  document.getElementById("qv-name").textContent = p.name;
  document.getElementById("qv-brand").textContent = p.brand;
  document.getElementById("qv-rating").innerHTML = `${getStarHTML(p.rating)} <span>${p.rating} (${p.reviews.toLocaleString()} reviews)</span>`;
  document.getElementById("qv-price").textContent = `${APP_CONFIG.currency}${dp.toLocaleString()}`;
  document.getElementById("qv-original").textContent = p.discount > 0 ? `${APP_CONFIG.currency}${p.price.toLocaleString()}` : "";
  document.getElementById("qv-desc").textContent = p.description;
  document.getElementById("qv-stock").textContent = p.stock === 0 ? "Out of Stock" : p.stock < 5 ? `Only ${p.stock} left!` : "In Stock";
  document.getElementById("qv-add-cart").onclick = () => {
    CartManager.addItem(id);
    closeQuickView();
  };
  document.getElementById("qv-add-cart").disabled = p.stock === 0;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeQuickView() {
  document.getElementById("quick-view-modal")?.classList.remove("active");
  document.body.style.overflow = "";
}

// ============================================================
// Pagination
// ============================================================
function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ""; return; }

  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-btn${i === currentPage ? " active" : ""}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<span class="page-ellipsis">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderProducts();
  renderPagination();
  document.getElementById("product-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
// Active Filter Tags
// ============================================================
function renderActiveFilterTags() {
  const container = document.getElementById("active-filters");
  if (!container) return;
  const tags = [];
  activeFilters.categories.forEach((c) => tags.push({ label: c, remove: () => { activeFilters.categories = activeFilters.categories.filter((x) => x !== c); const cb = document.querySelector(`.filter-cb[data-category="${c}"]`); if (cb) cb.checked = false; } }));
  activeFilters.brands.forEach((b) => tags.push({ label: b, remove: () => { activeFilters.brands = activeFilters.brands.filter((x) => x !== b); const cb = document.querySelector(`.filter-cb[data-brand="${b}"]`); if (cb) cb.checked = false; } }));
  if (activeFilters.rating > 0) tags.push({ label: `${activeFilters.rating}★ & up`, remove: () => { activeFilters.rating = 0; document.querySelector('input[name="rating"][value="0"]') && (document.querySelector('input[name="rating"][value="0"]').checked = true); } });
  if (activeFilters.inStockOnly) tags.push({ label: "In Stock Only", remove: () => { activeFilters.inStockOnly = false; const cb = document.getElementById("in-stock-toggle"); if (cb) cb.checked = false; } });
  if (searchQuery) tags.push({ label: `"${searchQuery}"`, remove: () => { searchQuery = ""; const inp = document.getElementById("search-input"); if (inp) inp.value = ""; } });

  container.innerHTML = tags.length
    ? tags.map((t, i) => `<span class="filter-tag">${t.label} <button onclick="removeTag(${i})" aria-label="Remove filter">×</button></span>`).join("") +
      `<button class="clear-all-btn" onclick="clearAllFilters()">Clear All</button>`
    : "";

  window._filterTagRemovers = tags.map((t) => t.remove);
}

function removeTag(idx) {
  if (window._filterTagRemovers && window._filterTagRemovers[idx]) {
    window._filterTagRemovers[idx]();
    currentPage = 1;
    applyFiltersAndSort();
    renderActiveFilterTags();
  }
}

function clearAllFilters() {
  activeFilters = { categories: [], brands: [], priceMin: 0, priceMax: Infinity, rating: 0, inStockOnly: false };
  searchQuery = "";
  const inp = document.getElementById("search-input");
  if (inp) inp.value = "";
  document.querySelectorAll(".filter-cb").forEach((cb) => (cb.checked = false));
  document.querySelectorAll('input[name="rating"]').forEach((r) => (r.value === "0" ? (r.checked = true) : (r.checked = false)));
  const stockCb = document.getElementById("in-stock-toggle");
  if (stockCb) stockCb.checked = false;
  const slider = document.getElementById("price-max-slider");
  if (slider) { slider.value = slider.max; document.getElementById("price-label").textContent = `Up to ${APP_CONFIG.currency}${parseInt(slider.max).toLocaleString()}`; }
  currentPage = 1;
  applyFiltersAndSort();
  renderActiveFilterTags();
}

// ============================================================
// Result Count
// ============================================================
function updateResultCount() {
  const el = document.getElementById("result-count");
  if (el) el.textContent = `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} found`;
}

// ============================================================
// Mobile Filter Toggle
// ============================================================
function toggleFilterSidebar() {
  const sidebar = document.getElementById("filter-sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  const open = sidebar?.classList.toggle("open");
  overlay?.classList.toggle("show", open);
  document.body.style.overflow = open ? "hidden" : "";
}
