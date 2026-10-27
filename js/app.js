/**
 * Crickstore - Main Application Logic
 * Manages JSON / Array data loading, dynamic category switching,
 * real-time filtering, shopping cart, quick view, and interactive product addition.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    categories: [],
    products: [],
    reviews: [],
    deals: [],
    activeCategory: 'all',
    activeBrand: 'all',
    searchQuery: '',
    sortBy: 'featured',
    maxPrice: 70000,
    inStockOnly: false,
    currency: 'INR',
    currencyRates: {
      INR: { symbol: '₹', rate: 1 },
      USD: { symbol: '$', rate: 0.012 },
      GBP: { symbol: '£', rate: 0.0095 },
      AUD: { symbol: 'A$', rate: 0.018 }
    },
    cart: [],
    wishlist: new Set(),
    knockingServiceIncluded: false,
    appliedCoupon: null,
    dataSource: 'Detecting...'
  };

  // DOM Elements
  const elements = {
    categoryTabs: document.getElementById('category-tabs'),
    categoryGrid: document.getElementById('category-grid'),
    productsGrid: document.getElementById('products-grid'),
    productCountText: document.getElementById('product-count-text'),
    activeCategoryTitle: document.getElementById('active-category-title'),
    activeCategoryDesc: document.getElementById('active-category-desc'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    brandFilters: document.getElementById('brand-filters'),
    priceRange: document.getElementById('price-range'),
    priceDisplay: document.getElementById('price-display'),
    inStockFilter: document.getElementById('instock-filter'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    currencySelect: document.getElementById('currency-select'),
    
    // Cart Elements
    cartBtn: document.getElementById('cart-btn'),
    cartDrawer: document.getElementById('cart-drawer'),
    cartBackdrop: document.getElementById('cart-backdrop'),
    cartCloseBtn: document.getElementById('cart-close-btn'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartEmptyState: document.getElementById('cart-empty-state'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartDiscountRow: document.getElementById('cart-discount-row'),
    cartDiscountAmount: document.getElementById('cart-discount-amount'),
    cartShipping: document.getElementById('cart-shipping'),
    cartTotal: document.getElementById('cart-total'),
    cartCountBadge: document.getElementById('cart-count-badge'),
    checkoutBtn: document.getElementById('checkout-btn'),
    promoInput: document.getElementById('promo-input'),
    applyPromoBtn: document.getElementById('apply-promo-btn'),
    promoMessage: document.getElementById('promo-message'),
    knockingAddonCheckbox: document.getElementById('knocking-addon-checkbox'),

    // Wishlist
    wishlistCountBadge: document.getElementById('wishlist-count-badge'),

    // Modals
    quickViewModal: document.getElementById('quick-view-modal'),
    quickViewClose: document.getElementById('quick-view-close'),
    quickViewContent: document.getElementById('quick-view-content'),
    
    addProductModal: document.getElementById('add-product-modal'),
    openAddProductBtn: document.getElementById('open-add-product-btn'),
    closeAddProductBtn: document.getElementById('close-add-product-btn'),
    addProductForm: document.getElementById('add-product-form'),
    productCategorySelect: document.getElementById('prod-category-select'),
    exportJsonBtn: document.getElementById('export-json-btn'),

    // Checkout Modal
    checkoutModal: document.getElementById('checkout-modal'),
    closeCheckoutBtn: document.getElementById('close-checkout-btn'),
    checkoutForm: document.getElementById('checkout-form'),
    checkoutSummary: document.getElementById('checkout-summary'),
    orderSuccessView: document.getElementById('order-success-view'),

    // Reviews & Flash Deals
    reviewsContainer: document.getElementById('reviews-container'),
    flashDealsContainer: document.getElementById('flash-deals-container'),
    dataSourceBadge: document.getElementById('data-source-badge'),
    toastNotification: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message')
  };

  /**
   * Currency Formatter Helper
   */
  function formatPrice(amountInINR) {
    const config = state.currencyRates[state.currency] || state.currencyRates.INR;
    const converted = amountInINR * config.rate;
    if (state.currency === 'INR') {
      return `${config.symbol}${Math.round(converted).toLocaleString('en-IN')}`;
    }
    return `${config.symbol}${converted.toFixed(2)}`;
  }

  /**
   * Show Toast Notification
   */
  function showToast(message, type = 'success') {
    if (!elements.toastNotification) return;
    elements.toastMessage.textContent = message;
    
    // Adjust colors based on type
    if (type === 'error') {
      elements.toastNotification.className = 'fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100';
    } else {
      elements.toastNotification.className = 'fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 transition-all duration-300 transform translate-y-0 opacity-100';
    }

    setTimeout(() => {
      elements.toastNotification.className = 'fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 transition-all duration-300 transform translate-y-12 opacity-0 pointer-events-none';
    }, 3200);
  }

  /**
   * Initialize Data from JSON files with Array fallback
   */
  async function initData() {
    let loadedFromJSON = false;

    try {
      // Attempt to load from JSON files in data/ directory
      const [catRes, prodRes, revRes, dealsRes] = await Promise.all([
        fetch('data/categories.json').catch(e => null),
        fetch('data/products.json').catch(e => null),
        fetch('data/reviews.json').catch(e => null),
        fetch('data/deals.json').catch(e => null)
      ]);

      if (catRes && catRes.ok && prodRes && prodRes.ok) {
        state.categories = await catRes.json();
        state.products = await prodRes.json();
        state.reviews = revRes && revRes.ok ? await revRes.json() : (window.CRIC_REVIEWS || []);
        state.deals = dealsRes && dealsRes.ok ? await dealsRes.json() : (window.CRIC_DEALS || []);
        loadedFromJSON = true;
        state.dataSource = 'JSON Files (data/*.json)';
      }
    } catch (err) {
      console.warn('Direct fetch from JSON failed (likely file:// protocol), using window.CRIC_* data arrays', err);
    }

    if (!loadedFromJSON) {
      // Fallback seamlessly to JavaScript data arrays
      state.categories = window.CRIC_CATEGORIES ? JSON.parse(JSON.stringify(window.CRIC_CATEGORIES)) : [];
      state.products = window.CRIC_PRODUCTS ? JSON.parse(JSON.stringify(window.CRIC_PRODUCTS)) : [];
      state.reviews = window.CRIC_REVIEWS ? JSON.parse(JSON.stringify(window.CRIC_REVIEWS)) : [];
      state.deals = window.CRIC_DEALS ? JSON.parse(JSON.stringify(window.CRIC_DEALS)) : [];
      state.dataSource = 'Direct Memory Data Arrays (window.CRIC_*)';
    }

    // Load persisted cart and wishlist from localStorage if available
    try {
      const savedCart = localStorage.getItem('cric_cart');
      if (savedCart) state.cart = JSON.parse(savedCart);
      const savedWishlist = localStorage.getItem('cric_wishlist');
      if (savedWishlist) state.wishlist = new Set(JSON.parse(savedWishlist));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }

    // Render Data Source Badge
    if (elements.dataSourceBadge) {
      elements.dataSourceBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Data Loaded via: ${state.dataSource}
        </span>
      `;
    }

    // Populate Category Dropdowns
    populateCategoryDropdown();

    // Render Components
    renderCategoryTabs();
    renderCategoryGrid();
    renderBrandFilters();
    renderProducts();
    renderReviews();
    renderFlashDeals();
    updateCartUI();
    updateWishlistUI();
  }

  /**
   * Populate Category select for adding new products
   */
  function populateCategoryDropdown() {
    if (!elements.productCategorySelect) return;
    elements.productCategorySelect.innerHTML = state.categories
      .filter(c => c.id !== 'all')
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join('');
  }

  /**
   * Render Category Tabs (Horizontal Pill Bar)
   */
  function renderCategoryTabs() {
    if (!elements.categoryTabs) return;

    elements.categoryTabs.innerHTML = state.categories.map(cat => {
      const isActive = state.activeCategory === cat.id;
      const count = cat.id === 'all' 
        ? state.products.length 
        : state.products.filter(p => p.category === cat.id).length;

      return `
        <button 
          data-category="${cat.id}"
          class="category-pill flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            isActive 
              ? 'bg-[#002d57] text-white shadow-md' 
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-sm'
          }">
          <span>${cat.name}</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}">
            ${count}
          </span>
        </button>
      `;
    }).join('');

    // Attach click listeners to tabs
    elements.categoryTabs.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-category');
        setCategory(catId);
      });
    });
  }

  /**
   * Render Quick Visual Category Cards
   */
  function renderCategoryGrid() {
    if (!elements.categoryGrid) return;

    const featuredCats = state.categories.filter(c => c.id !== 'all');

    elements.categoryGrid.innerHTML = featuredCats.map(cat => {
      const count = state.products.filter(p => p.category === cat.id).length;
      const img = cat.image || 'images/bat-willow.jpg';

      return `
        <div 
          data-category="${cat.id}"
          class="group cursor-pointer relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div class="h-32 w-full rounded-xl overflow-hidden bg-slate-50 relative mb-3">
            <img 
              src="${img}" 
              alt="${cat.name}" 
              class="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" 
              loading="lazy"
            />
            ${cat.badge ? `
              <span class="absolute top-2 left-2 bg-[#d03523] text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                ${cat.badge}
              </span>
            ` : ''}
          </div>
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-heading font-semibold text-slate-900 group-hover:text-[#002d57] transition-colors">
                ${cat.name}
              </h4>
              <p class="text-xs text-slate-500">${count} Products</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#002d57] group-hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    elements.categoryGrid.querySelectorAll('[data-category]').forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.getAttribute('data-category');
        setCategory(catId);
        // Smooth scroll to products section
        const prodSec = document.getElementById('products-section');
        if (prodSec) prodSec.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /**
   * Set Category & Update Header Texts
   */
  function setCategory(catId) {
    state.activeCategory = catId;
    const catObj = state.categories.find(c => c.id === catId);

    if (catObj && elements.activeCategoryTitle && elements.activeCategoryDesc) {
      elements.activeCategoryTitle.textContent = catObj.name;
      elements.activeCategoryDesc.textContent = catObj.description;
    }

    renderCategoryTabs();
    renderProducts();
  }

  /**
   * Render Brand Filter Checkboxes/Buttons
   */
  function renderBrandFilters() {
    if (!elements.brandFilters) return;

    // Collect unique brands from products array
    const brands = ['all', ...new Set(state.products.map(p => p.brand).filter(Boolean))];

    elements.brandFilters.innerHTML = brands.map(brand => {
      const isSelected = state.activeBrand === brand;
      const label = brand === 'all' ? 'All Brands' : brand;
      return `
        <button 
          data-brand="${brand}"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isSelected 
              ? 'bg-[#002d57] text-white border-[#002d57]' 
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }">
          ${label}
        </button>
      `;
    }).join('');

    elements.brandFilters.querySelectorAll('[data-brand]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeBrand = btn.getAttribute('data-brand');
        renderBrandFilters();
        renderProducts();
      });
    });
  }

  /**
   * Filter and Sort Products
   */
  function getFilteredProducts() {
    return state.products.filter(product => {
      // Category filter
      if (state.activeCategory !== 'all' && product.category !== state.activeCategory) {
        return false;
      }
      // Brand filter
      if (state.activeBrand !== 'all' && product.brand !== state.activeBrand) {
        return false;
      }
      // In Stock Only
      if (state.inStockOnly && !product.inStock) {
        return false;
      }
      // Max Price Filter
      if (product.price > state.maxPrice) {
        return false;
      }
      // Search Query
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase();
        const inName = product.name.toLowerCase().includes(query);
        const inBrand = (product.brand || '').toLowerCase().includes(query);
        const inDesc = (product.description || '').toLowerCase().includes(query);
        const inTags = (product.tags || []).some(t => t.toLowerCase().includes(query));
        if (!inName && !inBrand && !inDesc && !inTags) return false;
      }
      return true;
    }).sort((a, b) => {
      switch (state.sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'bestseller':
          return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
        case 'featured':
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
    });
  }

  /**
   * Render Product Cards
   */
  function renderProducts() {
    if (!elements.productsGrid) return;

    const filtered = getFilteredProducts();

    // Update count display
    if (elements.productCountText) {
      elements.productCountText.textContent = `Showing ${filtered.length} of ${state.products.length} products`;
    }

    if (filtered.length === 0) {
      elements.productsGrid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">No Cricket Gear Found</h3>
          <p class="text-sm text-slate-500 mb-4">Try adjusting your filters, price range, or category selection.</p>
          <button id="clear-search-btn" class="px-5 py-2.5 bg-[#002d57] text-white text-sm font-semibold rounded-xl hover:bg-[#001f3f] transition-colors shadow">
            Reset All Filters
          </button>
        </div>
      `;
      const clearBtn = document.getElementById('clear-search-btn');
      if (clearBtn) clearBtn.addEventListener('click', resetFilters);
      return;
    }

    elements.productsGrid.innerHTML = filtered.map(prod => {
      const isWishlisted = state.wishlist.has(prod.id);
      const discount = prod.originalPrice && prod.originalPrice > prod.price 
        ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
        : null;

      // Extract 2 key specs for preview pills
      const specKeys = prod.specs ? Object.keys(prod.specs).slice(0, 2) : [];

      return `
        <div class="card-hover-effect group bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col justify-between relative shadow-sm">
          <!-- Top Badge & Wishlist -->
          <div class="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div class="flex flex-col gap-1 items-start">
              ${prod.badge ? `
                <span class="badge-shimmer bg-[#d03523] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  ${prod.badge}
                </span>
              ` : ''}
              ${discount ? `
                <span class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  SAVE ${discount}%
                </span>
              ` : ''}
            </div>
            <button 
              data-wishlist-id="${prod.id}"
              class="pointer-events-auto w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors ${
                isWishlisted ? 'text-red-500' : ''
              }" 
              title="Add to Wishlist">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          <!-- Product Image & Quick View Trigger -->
          <div class="relative bg-slate-50 h-64 overflow-hidden flex items-center justify-center cursor-pointer group-img">
            <img 
              src="${prod.image}" 
              alt="${prod.name}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              loading="lazy"
            />
            <!-- Quick View Overlay Button -->
            <button 
              data-quickview-id="${prod.id}"
              class="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#002d57]/90 hover:bg-[#002d57] text-white text-xs font-semibold px-4 py-2 rounded-xl backdrop-blur-md shadow-lg flex items-center gap-1.5 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Quick Specs
            </button>
          </div>

          <!-- Content Details -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <!-- Brand & Stock -->
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="font-bold text-[#d03523] uppercase tracking-wider">${prod.brand || 'Crickstore'}</span>
                <span class="flex items-center gap-1 text-[11px] font-medium ${prod.inStock ? 'text-emerald-700' : 'text-slate-400'}">
                  <span class="w-1.5 h-1.5 rounded-full ${prod.inStock ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                  ${prod.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <!-- Product Name -->
              <h3 
                data-quickview-id="${prod.id}"
                class="font-heading font-bold text-slate-900 text-base line-clamp-2 hover:text-[#002d57] cursor-pointer transition-colors mb-2" 
                title="${prod.name}">
                ${prod.name}
              </h3>

              <!-- Ratings -->
              <div class="flex items-center gap-1.5 mb-3 text-xs">
                <div class="flex text-amber-400">
                  ${'★'.repeat(Math.round(prod.rating || 5))}${'☆'.repeat(5 - Math.round(prod.rating || 5))}
                </div>
                <span class="font-bold text-slate-700">${prod.rating || '5.0'}</span>
                <span class="text-slate-400">(${prod.reviewCount || 12})</span>
              </div>

              <!-- Spec highlights pills -->
              ${specKeys.length > 0 ? `
                <div class="flex flex-wrap gap-1.5 mb-4">
                  ${specKeys.map(k => `
                    <span class="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md">
                      ${prod.specs[k]}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Price & Add to Cart -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <div class="flex items-baseline gap-2">
                  <span class="text-lg font-heading font-extrabold text-[#002d57]">
                    ${formatPrice(prod.price)}
                  </span>
                  ${prod.originalPrice ? `
                    <span class="text-xs text-slate-400 line-through">
                      ${formatPrice(prod.originalPrice)}
                    </span>
                  ` : ''}
                </div>
                <span class="text-[10px] text-slate-500">Includes all taxes</span>
              </div>

              <!-- Add to Cart Button -->
              <button 
                data-cart-id="${prod.id}"
                ${!prod.inStock ? 'disabled' : ''}
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
                  prod.inStock 
                    ? 'bg-[#d03523] hover:bg-[#b52c1c] text-white active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                Add
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    attachProductCardListeners();
  }

  /**
   * Product Card Actions Listeners
   */
  function attachProductCardListeners() {
    // Add to Cart
    elements.productsGrid.querySelectorAll('[data-cart-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-cart-id');
        addToCart(id);
      });
    });

    // Wishlist Toggle
    elements.productsGrid.querySelectorAll('[data-wishlist-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-wishlist-id');
        toggleWishlist(id);
      });
    });

    // Quick View
    elements.productsGrid.querySelectorAll('[data-quickview-id]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = trigger.getAttribute('data-quickview-id');
        openQuickView(id);
      });
    });
  }

  /**
   * Cart Operations
   */
  function addToCart(productId, quantity = 1) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = state.cart.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
      state.cart[existingIndex].quantity += quantity;
    } else {
      state.cart.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: quantity
      });
    }

    persistCart();
    updateCartUI();
    showToast(`Added "${product.name.slice(0, 28)}..." to your cart!`);
    openCartDrawer();
  }

  function updateCartQuantity(productId, newQty) {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const item = state.cart.find(i => i.id === productId);
    if (item) {
      item.quantity = newQty;
      persistCart();
      updateCartUI();
    }
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.id !== productId);
    persistCart();
    updateCartUI();
    showToast('Item removed from cart', 'error');
  }

  function persistCart() {
    try {
      localStorage.setItem('cric_cart', JSON.stringify(state.cart));
    } catch (e) {
      console.warn('LocalStorage error saving cart', e);
    }
  }

  /**
   * Wishlist Operations
   */
  function toggleWishlist(productId) {
    if (state.wishlist.has(productId)) {
      state.wishlist.delete(productId);
      showToast('Removed from Wishlist', 'error');
    } else {
      state.wishlist.add(productId);
      showToast('Added to your Wishlist!');
    }
    try {
      localStorage.setItem('cric_wishlist', JSON.stringify([...state.wishlist]));
    } catch (e) {}
    updateWishlistUI();
    renderProducts();
  }

  function updateWishlistUI() {
    if (elements.wishlistCountBadge) {
      elements.wishlistCountBadge.textContent = state.wishlist.size;
      elements.wishlistCountBadge.style.display = state.wishlist.size > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Update Cart UI & Drawer Totals
   */
  function updateCartUI() {
    const totalItems = state.cart.reduce((sum, i) => sum + i.quantity, 0);

    // Update Header Badge
    if (elements.cartCountBadge) {
      elements.cartCountBadge.textContent = totalItems;
      elements.cartCountBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    if (!elements.cartItemsContainer) return;

    if (state.cart.length === 0) {
      elements.cartItemsContainer.classList.add('hidden');
      elements.cartEmptyState.classList.remove('hidden');
      elements.cartSubtotal.textContent = formatPrice(0);
      elements.cartTotal.textContent = formatPrice(0);
      elements.checkoutBtn.disabled = true;
      return;
    }

    elements.cartEmptyState.classList.add('hidden');
    elements.cartItemsContainer.classList.remove('hidden');
    elements.checkoutBtn.disabled = false;

    // Render items
    elements.cartItemsContainer.innerHTML = state.cart.map(item => `
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
        <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg bg-white border border-slate-200 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-bold text-[#d03523] uppercase">${item.brand || 'Gear'}</p>
          <h4 class="text-xs font-semibold text-slate-800 truncate" title="${item.name}">${item.name}</h4>
          <p class="text-xs font-bold text-[#002d57] mt-1">${formatPrice(item.price)}</p>
          <div class="flex items-center gap-2 mt-2">
            <div class="inline-flex items-center border border-slate-300 rounded-lg bg-white">
              <button 
                onclick="window.cricStore.updateCartQuantity('${item.id}', ${item.quantity - 1})"
                class="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-lg text-xs font-bold">
                -
              </button>
              <span class="w-6 text-center text-xs font-bold text-slate-800">${item.quantity}</span>
              <button 
                onclick="window.cricStore.updateCartQuantity('${item.id}', ${item.quantity + 1})"
                class="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-lg text-xs font-bold">
                +
              </button>
            </div>
            <button 
              onclick="window.cricStore.removeFromCart('${item.id}')"
              class="text-[11px] text-slate-400 hover:text-red-600 transition-colors ml-auto">
              Remove
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Calculate Totals
    const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    let discount = 0;

    if (state.appliedCoupon) {
      discount = subtotal * state.appliedCoupon.rate;
      if (elements.cartDiscountRow) {
        elements.cartDiscountRow.classList.remove('hidden');
        elements.cartDiscountAmount.textContent = `- ${formatPrice(discount)}`;
      }
    } else if (elements.cartDiscountRow) {
      elements.cartDiscountRow.classList.add('hidden');
    }

    // Addon Knocking service
    let knockingAddon = 0;
    if (state.knockingServiceIncluded) {
      knockingAddon = 499;
    }

    const shipping = subtotal >= 2000 ? 0 : 250;
    const finalTotal = Math.max(0, subtotal - discount + knockingAddon + shipping);

    elements.cartSubtotal.textContent = formatPrice(subtotal);
    elements.cartShipping.textContent = shipping === 0 ? 'FREE' : formatPrice(shipping);
    elements.cartTotal.textContent = formatPrice(finalTotal);
  }

  /**
   * Drawer Open / Close
   */
  function openCartDrawer() {
    if (!elements.cartDrawer || !elements.cartBackdrop) return;
    elements.cartBackdrop.classList.remove('hidden');
    setTimeout(() => {
      elements.cartBackdrop.classList.add('opacity-100');
      elements.cartDrawer.classList.remove('translate-x-full');
    }, 10);
  }

  function closeCartDrawer() {
    if (!elements.cartDrawer || !elements.cartBackdrop) return;
    elements.cartDrawer.classList.add('translate-x-full');
    elements.cartBackdrop.classList.remove('opacity-100');
    setTimeout(() => {
      elements.cartBackdrop.classList.add('hidden');
    }, 300);
  }

  /**
   * Quick View Modal
   */
  function openQuickView(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product || !elements.quickViewModal || !elements.quickViewContent) return;

    const specsRows = product.specs 
      ? Object.entries(product.specs).map(([k, v]) => `
          <tr class="border-b border-slate-100">
            <td class="py-2 text-xs font-semibold text-slate-500">${k}</td>
            <td class="py-2 text-xs font-medium text-slate-900">${v}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2" class="text-xs text-slate-400 py-2">Standard ICC & MCC certified match specifications.</td></tr>';

    elements.quickViewContent.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Media Gallery -->
        <div class="flex flex-col gap-3">
          <div class="h-80 w-full rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden relative">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover" />
            ${product.badge ? `
              <span class="absolute top-3 left-3 bg-[#d03523] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                ${product.badge}
              </span>
            ` : ''}
          </div>
          <div class="flex gap-2">
            <div class="w-16 h-16 rounded-xl border-2 border-[#002d57] overflow-hidden bg-slate-100">
              <img src="${product.image}" class="w-full h-full object-cover" />
            </div>
            <div class="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 opacity-60">
              <img src="images/batting-gear.jpg" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- Specifications & Buy -->
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="font-bold text-[#d03523] uppercase tracking-wider">${product.brand || 'Crickstore Gear'}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                ${product.inStock ? `In Stock (${product.stockCount || 5} units left)` : 'Out of Stock'}
              </span>
            </div>

            <h2 class="text-xl font-heading font-extrabold text-slate-900 mb-2">${product.name}</h2>
            
            <div class="flex items-center gap-2 mb-4 text-sm">
              <div class="text-amber-400">★★★★★</div>
              <span class="font-bold text-slate-800">${product.rating || '5.0'}</span>
              <span class="text-slate-400">(${product.reviewCount || 18} verified player reviews)</span>
            </div>

            <div class="flex items-baseline gap-3 mb-4">
              <span class="text-2xl font-extrabold text-[#002d57] font-heading">
                ${formatPrice(product.price)}
              </span>
              ${product.originalPrice ? `
                <span class="text-sm text-slate-400 line-through">
                  ${formatPrice(product.originalPrice)}
                </span>
                <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Save ${formatPrice(product.originalPrice - product.price)}
                </span>
              ` : ''}
            </div>

            <p class="text-xs text-slate-600 leading-relaxed mb-5">
              ${product.description}
            </p>

            <!-- Specs Table -->
            <div class="mb-6">
              <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Product Specifications</h4>
              <table class="w-full">
                <tbody>${specsRows}</tbody>
              </table>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-200 flex items-center gap-3">
            <button 
              onclick="window.cricStore.addToCart('${product.id}', 1); window.cricStore.closeQuickView();"
              ${!product.inStock ? 'disabled' : ''}
              class="flex-1 py-3 px-6 rounded-xl font-heading font-bold text-sm text-white shadow-lg transition-all ${
                product.inStock 
                  ? 'bg-[#d03523] hover:bg-[#b52c1c] active:scale-98 shadow-red-500/20' 
                  : 'bg-slate-300 cursor-not-allowed'
              }">
              Add to Shopping Cart
            </button>
            <button 
              onclick="window.cricStore.toggleWishlist('${product.id}')"
              class="p-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors" title="Wishlist">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    elements.quickViewModal.classList.remove('hidden');
    elements.quickViewModal.classList.add('flex');
  }

  function closeQuickView() {
    if (!elements.quickViewModal) return;
    elements.quickViewModal.classList.add('hidden');
    elements.quickViewModal.classList.remove('flex');
  }

  /**
   * Add New Equipment via Dynamic Arrays/JSON
   * Fulfills user request: "use arrays and json files to add new information based on category to show"
   */
  function handleAddNewProduct(e) {
    e.preventDefault();

    const name = document.getElementById('new-prod-name').value.trim();
    const category = document.getElementById('prod-category-select').value;
    const brand = document.getElementById('new-prod-brand').value.trim();
    const price = parseFloat(document.getElementById('new-prod-price').value) || 999;
    const originalPrice = parseFloat(document.getElementById('new-prod-original-price').value) || (price * 1.2);
    const badge = document.getElementById('new-prod-badge').value.trim() || 'New Arrival';
    const specWillow = document.getElementById('new-prod-willow').value.trim();
    const specWeight = document.getElementById('new-prod-weight').value.trim();
    const description = document.getElementById('new-prod-desc').value.trim() || 'Brand new premium quality cricket gear added to catalog.';

    // Pick appropriate image based on category
    let image = 'images/bat-willow.jpg';
    if (category === 'batting-gear' || category === 'wicket-keeping') image = 'images/batting-gear.jpg';
    if (category === 'helmets') image = 'images/helmet.jpg';
    if (category === 'balls') image = 'images/cricket-balls.jpg';
    if (category === 'kitbags') image = 'images/kitbag.jpg';

    const newProduct = {
      id: `prod-${Date.now()}`,
      name: name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: category,
      categoryName: state.categories.find(c => c.id === category)?.name || 'Equipment',
      brand: brand,
      price: price,
      originalPrice: originalPrice,
      rating: 5.0,
      reviewCount: 1,
      image: image,
      inStock: true,
      stockCount: 10,
      badge: badge,
      featured: true,
      specs: {
        "Grade / Material": specWillow || "Grade 1 Hand Crafted Willow",
        "Weight / Size": specWeight || "2 lb 8 oz (Men's Standard)",
        "Profile": "Extended Sweet Spot with Full Back Spine",
        "Warranty": "1-Year Official Manufacturer Warranty"
      },
      description: description,
      tags: [brand, category, "New Equipment", "Live Array Update"]
    };

    // Add to in-memory products array
    state.products.unshift(newProduct);

    // Update Category Counts
    const catObj = state.categories.find(c => c.id === category);
    if (catObj) catObj.count = (catObj.count || 0) + 1;

    // Reset Form & Close Modal
    elements.addProductForm.reset();
    closeAddProductModal();

    // Re-render UI
    renderCategoryTabs();
    renderCategoryGrid();
    renderBrandFilters();
    
    // Switch to category to immediately see new item
    setCategory(category);

    showToast(`Successfully added "${newProduct.name}" to category "${newProduct.categoryName}"!`);
  }

  function openAddProductModal() {
    if (!elements.addProductModal) return;
    elements.addProductModal.classList.remove('hidden');
    elements.addProductModal.classList.add('flex');
  }

  function closeAddProductModal() {
    if (!elements.addProductModal) return;
    elements.addProductModal.classList.add('hidden');
    elements.addProductModal.classList.remove('flex');
  }

  /**
   * Export Products JSON
   */
  function exportProductsJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "crickstore-products-updated.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Downloaded updated products.json file!");
  }

  /**
   * Render Customer Reviews Section (Judge.me inspired from Crickstore)
   */
  function renderReviews() {
    if (!elements.reviewsContainer) return;

    elements.reviewsContainer.innerHTML = state.reviews.map(rev => `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-sm card-hover-effect">
        <div>
          <!-- Stars & Verified Badge -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex text-amber-400 text-sm">
              ${'★'.repeat(rev.rating)}
            </div>
            ${rev.verified ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                Verified Buyer
              </span>
            ` : ''}
          </div>

          <h4 class="font-heading font-bold text-slate-900 text-base mb-2">"${rev.title}"</h4>
          <p class="text-xs text-slate-600 leading-relaxed mb-4">${rev.comment}</p>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-[#002d57] text-white flex items-center justify-center font-bold text-xs">
              ${rev.avatar}
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800">${rev.name}</p>
              <p class="text-[11px] text-slate-400">${rev.location}</p>
            </div>
          </div>
          <span class="text-[10px] text-slate-400">${rev.date}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render Flash Deals
   */
  function renderFlashDeals() {
    if (!elements.flashDealsContainer) return;

    elements.flashDealsContainer.innerHTML = state.deals.map(deal => `
      <div class="bg-gradient-to-br from-[#002d57] to-[#001730] text-white rounded-3xl p-8 relative overflow-hidden shadow-xl border border-white/10 flex flex-col justify-between">
        <div class="relative z-10">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d03523] text-white text-xs font-bold uppercase tracking-wider mb-4">
            <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
            ${deal.badge}
          </div>
          <h3 class="text-2xl font-heading font-black mb-1">${deal.title}</h3>
          <p class="text-amber-400 font-bold text-sm mb-3">${deal.tagline}</p>
          <p class="text-slate-300 text-xs leading-relaxed mb-6">${deal.description}</p>
        </div>

        <div class="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
          <div>
            <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Use Promo Code</span>
            <span class="font-mono font-bold text-base text-white tracking-widest bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 inline-block mt-0.5">
              ${deal.code}
            </span>
          </div>
          <button 
            onclick="window.cricStore.applyDealCode('${deal.code}')"
            class="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#002d57] text-xs font-bold shadow-lg transition-transform active:scale-95">
            Apply Deal
          </button>
        </div>

        <!-- Decorative background glow -->
        <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    `).join('');
  }

  /**
   * Checkout Modal Handling
   */
  function openCheckout() {
    if (state.cart.length === 0) return;
    closeCartDrawer();
    if (!elements.checkoutModal) return;

    const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discount = state.appliedCoupon ? subtotal * state.appliedCoupon.rate : 0;
    const knocking = state.knockingServiceIncluded ? 499 : 0;
    const shipping = subtotal >= 2000 ? 0 : 250;
    const total = subtotal - discount + knocking + shipping;

    elements.checkoutSummary.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 space-y-2 text-xs">
        <div class="flex justify-between text-slate-600">
          <span>Items (${state.cart.length}):</span>
          <span class="font-bold text-slate-900">${formatPrice(subtotal)}</span>
        </div>
        ${discount > 0 ? `
          <div class="flex justify-between text-emerald-600">
            <span>Promo Discount:</span>
            <span class="font-bold">- ${formatPrice(discount)}</span>
          </div>
        ` : ''}
        ${knocking > 0 ? `
          <div class="flex justify-between text-slate-600">
            <span>Bat Knocking Service:</span>
            <span class="font-bold">+ ${formatPrice(knocking)}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-slate-600">
          <span>Delivery Shipping:</span>
          <span class="font-bold text-slate-900">${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
        </div>
        <div class="pt-2 border-t border-slate-200 flex justify-between text-sm font-heading font-extrabold text-[#002d57]">
          <span>Total Payable:</span>
          <span>${formatPrice(total)}</span>
        </div>
      </div>
    `;

    elements.orderSuccessView.classList.add('hidden');
    elements.checkoutForm.classList.remove('hidden');
    elements.checkoutModal.classList.remove('hidden');
    elements.checkoutModal.classList.add('flex');
  }

  function handleCheckoutSubmit(e) {
    e.preventDefault();
    // Simulate order placement
    elements.checkoutForm.classList.add('hidden');
    elements.orderSuccessView.classList.remove('hidden');
    
    // Clear Cart
    state.cart = [];
    persistCart();
    updateCartUI();
  }

  function resetFilters() {
    state.activeCategory = 'all';
    state.activeBrand = 'all';
    state.searchQuery = '';
    state.maxPrice = 70000;
    state.inStockOnly = false;
    state.sortBy = 'featured';

    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.sortSelect) elements.sortSelect.value = 'featured';
    if (elements.priceRange) elements.priceRange.value = 70000;
    if (elements.priceDisplay) elements.priceDisplay.textContent = formatPrice(70000);
    if (elements.inStockFilter) elements.inStockFilter.checked = false;

    renderCategoryTabs();
    renderBrandFilters();
    renderProducts();
  }

  /**
   * Event Listeners Registration
   */
  function registerEvents() {
    // Search input
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderProducts();
      });
    }

    // Sort Select
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderProducts();
      });
    }

    // Price range slider
    if (elements.priceRange) {
      elements.priceRange.addEventListener('input', (e) => {
        state.maxPrice = parseFloat(e.target.value);
        if (elements.priceDisplay) {
          elements.priceDisplay.textContent = formatPrice(state.maxPrice);
        }
        renderProducts();
      });
    }

    // In Stock checkbox
    if (elements.inStockFilter) {
      elements.inStockFilter.addEventListener('change', (e) => {
        state.inStockOnly = e.target.checked;
        renderProducts();
      });
    }

    // Reset filters button
    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.addEventListener('click', resetFilters);
    }

    // Currency Switcher
    if (elements.currencySelect) {
      elements.currencySelect.addEventListener('change', (e) => {
        state.currency = e.target.value;
        if (elements.priceDisplay) {
          elements.priceDisplay.textContent = formatPrice(state.maxPrice);
        }
        renderProducts();
        updateCartUI();
        showToast(`Currency changed to ${state.currency} (${state.currencyRates[state.currency].symbol})`);
      });
    }

    // Cart Drawer Toggle
    if (elements.cartBtn) elements.cartBtn.addEventListener('click', openCartDrawer);
    if (elements.cartCloseBtn) elements.cartCloseBtn.addEventListener('click', closeCartDrawer);
    if (elements.cartBackdrop) elements.cartBackdrop.addEventListener('click', closeCartDrawer);

    // Knocking Service Addon
    if (elements.knockingAddonCheckbox) {
      elements.knockingAddonCheckbox.addEventListener('change', (e) => {
        state.knockingServiceIncluded = e.target.checked;
        updateCartUI();
      });
    }

    // Promo Code Application
    if (elements.applyPromoBtn) {
      elements.applyPromoBtn.addEventListener('click', () => {
        const code = (elements.promoInput.value || '').trim().toUpperCase();
        if (code === 'CRICKET10') {
          state.appliedCoupon = { code: 'CRICKET10', rate: 0.10 };
          elements.promoMessage.innerHTML = '<span class="text-xs text-emerald-600 font-bold">✓ 10% Discount Applied!</span>';
        } else if (code === 'WILLOW2026') {
          state.appliedCoupon = { code: 'WILLOW2026', rate: 0.12 };
          elements.promoMessage.innerHTML = '<span class="text-xs text-emerald-600 font-bold">✓ 12% Willow Season Discount Applied!</span>';
        } else if (code === 'SAFEPRO') {
          state.appliedCoupon = { code: 'SAFEPRO', rate: 0.15 };
          elements.promoMessage.innerHTML = '<span class="text-xs text-emerald-600 font-bold">✓ 15% Protection Bundle Applied!</span>';
        } else {
          elements.promoMessage.innerHTML = '<span class="text-xs text-red-500 font-bold">Invalid promo coupon code</span>';
        }
        updateCartUI();
      });
    }

    // Quick View Modal Close
    if (elements.quickViewClose) elements.quickViewClose.addEventListener('click', closeQuickView);
    if (elements.quickViewModal) {
      elements.quickViewModal.addEventListener('click', (e) => {
        if (e.target === elements.quickViewModal) closeQuickView();
      });
    }

    // Add Product Modal
    if (elements.openAddProductBtn) elements.openAddProductBtn.addEventListener('click', openAddProductModal);
    if (elements.closeAddProductBtn) elements.closeAddProductBtn.addEventListener('click', closeAddProductModal);
    if (elements.addProductForm) elements.addProductForm.addEventListener('submit', handleAddNewProduct);
    if (elements.exportJsonBtn) elements.exportJsonBtn.addEventListener('click', exportProductsJSON);

    // Checkout Modal
    if (elements.checkoutBtn) elements.checkoutBtn.addEventListener('click', openCheckout);
    if (elements.closeCheckoutBtn) elements.closeCheckoutBtn.addEventListener('click', () => {
      elements.checkoutModal.classList.add('hidden');
      elements.checkoutModal.classList.remove('flex');
    });
    if (elements.checkoutForm) elements.checkoutForm.addEventListener('submit', handleCheckoutSubmit);

    // Keyboard Esc key to close any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCartDrawer();
        closeQuickView();
        closeAddProductModal();
        if (elements.checkoutModal) {
          elements.checkoutModal.classList.add('hidden');
          elements.checkoutModal.classList.remove('flex');
        }
      }
    });
  }

  // Expose global controller for inline onclick actions
  window.cricStore = {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    toggleWishlist,
    openQuickView,
    closeQuickView,
    setCategory,
    openAddProductModal,
    applyDealCode: (code) => {
      openCartDrawer();
      if (elements.promoInput) {
        elements.promoInput.value = code;
        if (elements.applyPromoBtn) elements.applyPromoBtn.click();
      }
    }
  };

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initData();
    registerEvents();
  });
})();
