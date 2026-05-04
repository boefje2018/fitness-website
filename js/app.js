const XML_FEED_URL = 'https://www.ds.gymtayt.com/?a=xml_feed&token=f5847597028457e2dbaa2b5ad717b024bccbb550b4bb5992c6f37a7e2f883102';
const PROXY_URL = 'https://api.allorigins.win/get?url=';

let allProducts = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let selectedColors = {};
let selectedSizes = {};

const colorMap = {
    'siyah': '#000000', 'beyaz': '#ffffff', 'kirmizi': '#e74c3c', 'mavi': '#3498db',
    'yesil': '#27ae60', 'pembe': '#fd79a8', 'mor': '#9b59b6', 'gri': '#636e72',
    'lacivert': '#2c3e50', 'bordo': '#800020', 'bej': '#d4b896', 'kahverengi': '#8B4513',
    'sari': '#f1c40f', 'turuncu': '#e67e22', 'koyu yesil': '#1a472a',
    'kirmizi-siyah': '#e74c3c', 'yesil-siyah': '#27ae60', 'gri-siyah': '#636e72',
    'bordo-siyah': '#800020', 'mor-siyah': '#9b59b6'
};

function getColorHex(colorName) {
    if (!colorName) return '#ccc';
    const lower = colorName.toLowerCase().trim();
    return colorMap[lower] || '#ccc';
}

async function fetchXMLFeed() {
    try {
        const response = await fetch(PROXY_URL + encodeURIComponent(XML_FEED_URL));
        const data = await response.json();
        if (data.contents) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
            parseProducts(xmlDoc);
        }
    } catch (error) {
        console.error('XML feed yüklenemedi:', error);
        document.getElementById('loadingSpinner').innerHTML = '<p class="error">Ürünler yüklenirken hata oluştu. Sayfayı yenileyin.</p>';
    }
}

function parseProducts(xmlDoc) {
    const parents = xmlDoc.querySelectorAll('parent');
    allProducts = [];

    parents.forEach(parent => {
        const product = {
            id: getText(parent, 'item_group_id'),
            name: getText(parent, 'name'),
            brand: getText(parent, 'brand'),
            description: getText(parent, 'description'),
            category: getText(parent, 'category'),
            categorySlug: getCategorySlug(parent),
            mainImage: getText(parent, 'main'),
            galleryImages: getGalleryImages(parent),
            createdAt: getText(parent, 'created_at'),
            variants: []
        };

        const variants = parent.querySelectorAll('variant');
        const colors = new Set();
        const sizes = new Set();

        variants.forEach(v => {
            const variant = {
                id: getText(v, 'id'),
                sku: getText(v, 'sku'),
                price: parseFloat(getText(v, 'price')),
                regularPrice: parseFloat(getText(v, 'regular_price')),
                stockStatus: getText(v, 'stock_status'),
                stockQty: parseInt(getText(v, 'stock_qty')),
                bed: getAttribute(v, 'attribute', 'Beden'),
                renk: getAttribute(v, 'attribute', 'Renk'),
                image: getText(v, 'image')
            };
            product.variants.push(variant);
            if (variant.renk) colors.add(variant.renk);
            if (variant.bed) sizes.add(variant.bed);
        });

        product.colors = Array.from(colors);
        product.sizes = Array.from(sizes).sort((a, b) => {
            const order = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
            return order.indexOf(a) - order.indexOf(b);
        });
        product.minPrice = Math.min(...product.variants.map(v => v.price));
        product.maxPrice = Math.max(...product.variants.map(v => v.price));
        product.hasStock = product.variants.some(v => v.stockStatus === 'instock');

        allProducts.push(product);
    });

    setupCategories();
    setupBrandFilters();
    filteredProducts = [...allProducts];
    renderProducts();
    document.getElementById('loadingSpinner').style.display = 'none';
}

function getText(parent, tag) {
    const el = parent.querySelector(tag);
    return el ? el.textContent.trim() : '';
}

function getCategorySlug(parent) {
    const cat = parent.querySelector('category');
    return cat ? cat.getAttribute('slug') : '';
}

function getAttribute(parent, tag, name) {
    const attrs = parent.querySelectorAll(tag);
    for (let attr of attrs) {
        if (attr.getAttribute('name') === name) {
            return attr.textContent.trim();
        }
    }
    return '';
}

function getGalleryImages(parent) {
    const images = parent.querySelectorAll('gallery image');
    return Array.from(images).map(img => img.textContent.trim());
}

function setupCategories() {
    const categories = [...new Set(allProducts.map(p => p.category))].filter(c => c);
    const nav = document.getElementById('categoryNav');
    const footerCats = document.getElementById('footerCategories');

    nav.innerHTML = '<li class="active"><a href="#" onclick="filterByCategory(\'all\'); return false;">Tüm Ürünler</a></li>';
    footerCats.innerHTML = '';

    categories.forEach(cat => {
        nav.innerHTML += `<li><a href="#" onclick="filterByCategory('${cat}'); return false;">${cat}</a></li>`;
        footerCats.innerHTML += `<li><a href="#" onclick="filterByCategory('${cat}'); return false;">${cat}</a></li>`;
    });
}

function setupBrandFilters() {
    const brands = [...new Set(allProducts.map(p => p.brand))].sort();
    const container = document.getElementById('brandFilters');
    container.innerHTML = '';

    brands.forEach(brand => {
        container.innerHTML += `
            <label class="brand-filter">
                <input type="checkbox" value="${brand}" onchange="applyFilters()">
                ${brand}
            </label>
        `;
    });
}

function filterByCategory(category) {
    document.querySelectorAll('.main-nav li').forEach(li => li.classList.remove('active'));
    event.target.closest('li').classList.add('active');

    if (category === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => p.categorySlug === category || p.category === category);
    }
    applyFilters();
    document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
}

function handleSearch(query) {
    if (!query.trim()) {
        filteredProducts = [...allProducts];
    } else {
        const q = query.toLowerCase();
        filteredProducts = allProducts.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }
    applyFilters();
}

function applyFilters() {
    let products = [...filteredProducts];

    const checkedBrands = Array.from(document.querySelectorAll('#brandFilters input:checked')).map(i => i.value);
    if (checkedBrands.length > 0) {
        products = products.filter(p => checkedBrands.includes(p.brand));
    }

    const minPrice = parseFloat(document.getElementById('minPrice').value);
    const maxPrice = parseFloat(document.getElementById('maxPrice').value);
    if (!isNaN(minPrice)) products = products.filter(p => p.minPrice >= minPrice);
    if (!isNaN(maxPrice)) products = products.filter(p => p.minPrice <= maxPrice);

    if (document.getElementById('inStockOnly').checked) {
        products = products.filter(p => p.hasStock);
    }

    const sort = document.getElementById('sortSelect').value;
    switch (sort) {
        case 'price-asc': products.sort((a, b) => a.minPrice - b.minPrice); break;
        case 'price-desc': products.sort((a, b) => b.minPrice - a.minPrice); break;
        case 'name-asc': products.sort((a, b) => a.name.localeCompare(b.name, 'tr')); break;
        case 'name-desc': products.sort((a, b) => b.name.localeCompare(a.name, 'tr')); break;
        case 'discount': products.sort((a, b) => {
            const discA = ((a.variants[0]?.regularPrice || 0) - a.minPrice) / (a.variants[0]?.regularPrice || 1);
            const discB = ((b.variants[0]?.regularPrice || 0) - b.minPrice) / (b.variants[0]?.regularPrice || 1);
            return discB - discA;
        }); break;
    }

    renderProducts(products);
}

function clearFilters() {
    document.querySelectorAll('#brandFilters input').forEach(i => i.checked = false);
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('inStockOnly').checked = false;
    document.getElementById('sortSelect').value = 'default';
    document.getElementById('searchInput').value = '';
    filteredProducts = [...allProducts];
    renderProducts();
}

function renderProducts(products = allProducts) {
    const grid = document.getElementById('productsGrid');
    document.getElementById('productCountText').textContent = `${products.length} ürün bulundu`;

    if (products.length === 0) {
        grid.innerHTML = '<div class="no-products"><p>Ürün bulunamadı.</p></div>';
        return;
    }

    grid.innerHTML = products.map(product => {
        const firstVariant = product.variants[0];
        const discount = firstVariant ? Math.round(((firstVariant.regularPrice - product.minPrice) / firstVariant.regularPrice) * 100) : 0;
        const badgeClass = !product.hasStock ? 'badge-out' : discount > 15 ? 'badge-sale' : 'badge-new';
        const badgeText = !product.hasStock ? 'Tükendi' : discount > 0 ? `-${discount}%` : 'Yeni';

        return `
            <div class="product-card" onclick="openProductModal('${product.id}')">
                <div class="product-image">
                    <img src="${product.mainImage}" alt="${product.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 500%22><rect fill=%22%23ddd%22 width=%22400%22 height=%22500%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2216%22>Resim Yok</text></svg>'">
                    <span class="product-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">₺${product.minPrice.toFixed(2)}</span>
                        ${discount > 0 ? `<span class="original-price">₺${firstVariant.regularPrice.toFixed(2)}</span>` : ''}
                    </div>
                    <div class="product-colors">
                        ${product.colors.slice(0, 5).map(c => `<span class="color-dot" style="background:${getColorHex(c)}" title="${c}"></span>`).join('')}
                        ${product.colors.length > 5 ? `<span class="color-dot" style="background:var(--gray-3)">+${product.colors.length - 5}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    selectedColors[productId] = product.colors[0] || '';
    selectedSizes[productId] = '';

    const modal = document.getElementById('productModal');
    const detail = document.getElementById('productDetail');

    const firstVariant = product.variants[0];
    const discount = firstVariant ? Math.round(((firstVariant.regularPrice - product.minPrice) / firstVariant.regularPrice) * 100) : 0;

    detail.innerHTML = `
        <div class="product-detail">
            <div class="product-gallery">
                <img id="mainImage" class="main-image" src="${product.mainImage}" alt="${product.name}">
                ${product.galleryImages.length > 0 ? `
                    <div class="gallery-thumbs">
                        <img src="${product.mainImage}" class="active" onclick="changeMainImage('${product.mainImage}', this)">
                        ${product.galleryImages.map(img => `<img src="${img}" onclick="changeMainImage('${img}', this)">`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="detail-info">
                <div class="detail-brand">${product.brand}</div>
                <h1>${product.name}</h1>
                <div class="detail-prices">
                    <span class="detail-current-price">₺${product.minPrice.toFixed(2)}</span>
                    ${discount > 0 ? `<span class="detail-original-price">₺${firstVariant.regularPrice.toFixed(2)}</span><span class="product-badge badge-sale">-${discount}%</span>` : ''}
                </div>

                ${product.colors.length > 0 ? `
                    <div class="variant-section">
                        <h4>Renk: <span id="selectedColorName">${selectedColors[productId]}</span></h4>
                        <div class="variant-options">
                            ${product.colors.map(c => `
                                <button class="variant-btn ${c === selectedColors[productId] ? 'active' : ''}"
                                        onclick="selectColor('${productId}', '${c}')">${c}</button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="variant-section">
                    <h4>Beden</h4>
                    <div class="variant-options">
                        ${product.sizes.map(s => {
                            const available = product.variants.some(v => v.bed === s && (selectedColors[productId] ? v.renk === selectedColors[productId] : true) && v.stockStatus === 'instock');
                            return `<button class="variant-btn ${!available ? 'disabled' : ''}"
                                         onclick="${available ? `selectSize('${productId}', '${s}')` : ''}">${s}</button>`;
                        }).join('')}
                    </div>
                </div>

                ${selectedSizes[productId] ? `
                    <div class="detail-stock ${getVariantForPurchase(product)?.stockStatus === 'instock' ? 'stock-in' : 'stock-out'}">
                        ${getVariantForPurchase(product)?.stockStatus === 'instock' ? `Stokta (${getVariantForPurchase(product)?.stockQty} adet)` : 'Stokta Yok'}
                    </div>
                ` : ''}

                <button class="add-to-cart-btn" onclick="addToCart('${productId}')" ${!selectedSizes[productId] || getVariantForPurchase(product)?.stockStatus !== 'instock' ? 'disabled' : ''}>
                    ${!selectedSizes[productId] ? 'Beden Seçin' : getVariantForPurchase(product)?.stockStatus !== 'instock' ? 'Stokta Yok' : 'Sepete Ekle'}
                </button>

                <div class="detail-description">
                    <h4>Ürün Açıklaması</h4>
                    <div>${product.description}</div>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function getVariantForPurchase(product) {
    if (!product || !selectedSizes[product.id]) return null;
    const color = selectedColors[product.id] || '';
    const size = selectedSizes[product.id];
    return product.variants.find(v => v.bed === size && (!color || v.renk === color)) ||
           product.variants.find(v => v.bed === size);
}

function changeMainImage(src, thumb) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.gallery-thumbs img').forEach(i => i.classList.remove('active'));
    thumb.classList.add('active');
}

function selectColor(productId, color) {
    selectedColors[productId] = color;
    selectedSizes[productId] = '';
    openProductModal(productId);
}

function selectSize(productId, size) {
    selectedSizes[productId] = size;
    openProductModal(productId);
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const variant = getVariantForPurchase(product);
    if (!variant || variant.stockStatus !== 'instock') return;

    const cartItem = {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        brand: product.brand,
        image: variant.image || product.mainImage,
        price: variant.price,
        bed: variant.bed,
        renk: variant.renk,
        sku: variant.sku,
        quantity: 1
    };

    const existing = cart.find(item => item.variantId === variant.id);
    if (existing) {
        if (existing.quantity < variant.stockQty) {
            existing.quantity++;
        } else {
            alert('Stok limiti aşıldı!');
            return;
        }
    } else {
        cart.push(cartItem);
    }

    saveCart();
    updateCartCount();
    closeModal();
    toggleCart();
}

function removeFromCart(variantId) {
    cart = cart.filter(item => item.variantId !== variantId);
    saveCart();
    updateCartCount();
    renderCart();
}

function updateQuantity(variantId, delta) {
    const item = cart.find(i => i.variantId === variantId);
    if (!item) return;

    const product = allProducts.find(p => p.id === item.productId);
    const variant = product?.variants.find(v => v.id === variantId);

    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(variantId);
        return;
    }
    if (variant && item.quantity > variant.stockQty) {
        item.quantity = variant.stockQty;
        alert('Maksimum stok sayısına ulaşıldı!');
    }

    saveCart();
    updateCartCount();
    renderCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    const isActive = sidebar.classList.contains('active');

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = isActive ? '' : 'hidden';

    if (!isActive) renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');

    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty"><p>Sepetiniz boş</p></div>';
        document.getElementById('cartTotal').textContent = '₺0.00';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-variant">${item.renk} / ${item.bed}</div>
                <div class="cart-item-bottom">
                    <div class="quantity-controls">
                        <button onclick="updateQuantity('${item.variantId}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.variantId}', 1)">+</button>
                    </div>
                    <span class="cart-item-price">₺${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="remove-item" onclick="removeFromCart('${item.variantId}')">Sil</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = `₺${total.toFixed(2)}`;
}

function checkout() {
    if (cart.length === 0) {
        alert('Sepetiniz boş!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const message = cart.map(item =>
        `${item.name} - ${item.renk} / ${item.bed} x${item.quantity} = ₺${(item.price * item.quantity).toFixed(2)}`
    ).join('\n') + `\n\nToplam: ₺${total.toFixed(2)}`;

    alert('Sipariş Özeti:\n\n' + message + '\n\nBu bir demo sitesidir. Gerçek ödeme alınmamaktadır.');
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
}

function showHome() {
    clearFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('productModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        if (document.getElementById('cartSidebar').classList.contains('active')) {
            toggleCart();
        }
    }
});

// Init
fetchXMLFeed();
updateCartCount();
