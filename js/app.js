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

function loadProductsFromAdmin() {
    const xmlProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
    const manualProducts = JSON.parse(localStorage.getItem('manualProducts') || '[]');
    const allAdminProducts = [...xmlProducts, ...manualProducts];

    if (allAdminProducts.length > 0) {
        allProducts = allAdminProducts.map(p => ({
            ...p,
            colors: p.colors || [],
            sizes: p.sizes || [],
            galleryImages: p.galleryImages || [],
            videoUrl: p.videoUrl || '',
            variants: p.variants || []
        }));
        setupCategories();
        setupBrandFilters();
        filteredProducts = [...allProducts];
        renderProducts();
        document.getElementById('loadingSpinner').style.display = 'none';
        return true;
    }
    return false;
}

async function fetchXMLFeed() {
    if (loadProductsFromAdmin()) {
        return;
    }

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
        if (attr.getAttribute('name') === name) return attr.textContent.trim();
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
    if (checkedBrands.length > 0) products = products.filter(p => checkedBrands.includes(p.brand));

    const minPrice = parseFloat(document.getElementById('minPrice').value);
    const maxPrice = parseFloat(document.getElementById('maxPrice').value);
    if (!isNaN(minPrice)) products = products.filter(p => p.minPrice >= minPrice);
    if (!isNaN(maxPrice)) products = products.filter(p => p.minPrice <= maxPrice);

    if (document.getElementById('inStockOnly').checked) products = products.filter(p => p.hasStock);

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
                        ${(product.colors || []).slice(0, 5).map(c => `<span class="color-dot" style="background:${getColorHex(c)}" title="${c}"></span>`).join('')}
                        ${(product.colors || []).length > 5 ? `<span class="color-dot" style="background:var(--gray-3)">+${product.colors.length - 5}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    selectedColors[productId] = (product.colors || [])[0] || '';
    selectedSizes[productId] = '';

    const modal = document.getElementById('productModal');
    const detail = document.getElementById('productDetail');

    const firstVariant = product.variants[0];
    const discount = firstVariant ? Math.round(((firstVariant.regularPrice - product.minPrice) / firstVariant.regularPrice) * 100) : 0;

    detail.innerHTML = `
        <div class="product-detail">
            <div class="product-gallery">
                <img id="mainImage" class="main-image" src="${product.mainImage}" alt="${product.name}">
                ${(product.galleryImages || []).length > 0 ? `
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

                ${(product.colors || []).length > 0 ? `
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
                        ${(product.sizes || []).map(s => {
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
    showCheckout();
}

function showCartItems() {
    document.getElementById('checkoutSection').style.display = 'none';
    document.getElementById('cartFooter').style.display = 'block';
}

function showCheckout() {
    if (cart.length === 0) {
        alert('Sepetiniz boş!');
        return;
    }
    const paymentSettings = getPaymentSettings();
    const container = document.getElementById('paymentMethods');
    let html = '';

    if (paymentSettings.whatsapp) {
        html += `<label class="payment-method-option" onclick="selectPayment('whatsapp')"><input type="radio" name="paymentMethod" value="whatsapp" checked><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg><span>WhatsApp ile Sipariş</span></label>`;
    }
    if (paymentSettings.email) {
        html += `<label class="payment-method-option" onclick="selectPayment('email')"><input type="radio" name="paymentMethod" value="email"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>E-posta ile Sipariş</span></label>`;
    }
    if (paymentSettings.door) {
        html += `<label class="payment-method-option" onclick="selectPayment('door')"><input type="radio" name="paymentMethod" value="door"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span>Kapıda Ödeme</span></label>`;
    }
    if (paymentSettings.bank) {
        html += `<label class="payment-method-option" onclick="selectPayment('bank')"><input type="radio" name="paymentMethod" value="bank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg><span>EFT/Havale</span></label>`;
    }

    container.innerHTML = html || '<p style="color:var(--gray-2);font-size:0.9rem">Ödeme yöntemi bulunmuyor.</p>';
    document.getElementById('checkoutSection').style.display = 'block';
    document.getElementById('cartFooter').style.display = 'none';
}

function selectPayment(method) {
    document.querySelectorAll('.payment-method-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`input[name="paymentMethod"][value="${method}"]`).closest('.payment-method-option').classList.add('selected');
}

function completeOrder() {
    const name = document.getElementById('checkName').value.trim();
    const phone = document.getElementById('checkPhone').value.trim();
    const email = document.getElementById('checkEmail').value.trim();
    const address = document.getElementById('checkAddress').value.trim();
    const note = document.getElementById('checkNote').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

    if (!name || !phone || !address) {
        alert('Lütfen ad, telefon ve adres alanlarını doldurun.');
        return;
    }
    if (!paymentMethod) {
        alert('Lütfen bir ödeme yöntemi seçin.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderItems = cart.map(item => `${item.name} (${item.renk} / ${item.bed}) x${item.quantity} - ₺${(item.price * item.quantity).toFixed(2)}`).join('\n');
    const orderSummary = `Sipariş Özeti:\n\nMüşteri: ${name}\nTelefon: ${phone}\nE-posta: ${email || '-'}\nAdres: ${address}\nÖdeme: ${getPaymentLabel(paymentMethod)}\n\n${orderItems}\n\nToplam: ₺${total.toFixed(2)}${note ? '\nNot: ' + note : ''}`;

    const order = {
        id: 'ORD-' + Date.now(),
        date: new Date().toISOString(),
        customer: { name, phone, email, address },
        paymentMethod,
        items: cart.map(i => ({ ...i })),
        total,
        note,
        status: 'pending'
    };

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    switch (paymentMethod) {
        case 'whatsapp':
            const contact = JSON.parse(localStorage.getItem('contactSettings') || '{}');
            const waNumber = contact.whatsapp || '905000000000';
            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(orderSummary)}`;
            window.open(waUrl, '_blank');
            break;
        case 'email':
            const mailSubject = `Sipariş #${order.id}`;
            window.location.href = `mailto:${contact.email || ''}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(orderSummary)}`;
            break;
        case 'door':
        case 'bank':
            alert('Siparişiniz alındı!\n\n' + orderSummary);
            break;
    }

    cart = [];
    saveCart();
    updateCartCount();
    showCartItems();
    toggleCart();
    showToast('Siparişiniz gönderildi!');
}

function getPaymentLabel(method) {
    return { whatsapp: 'WhatsApp', email: 'E-posta', door: 'Kapıda Ödeme', bank: 'EFT/Havale' }[method] || method;
}

function getPaymentSettings() {
    return JSON.parse(localStorage.getItem('paymentSettings') || JSON.stringify({
        whatsapp: true, email: true, door: true, bank: false
    }));
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:8px;color:white;font-weight:500;z-index:10000;animation:slideIn 0.3s ease;background:${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===================== AI CHAT =====================
function toggleAiChat() {
    const window = document.getElementById('aiChatWindow');
    const isOpen = window.style.display !== 'none';
    window.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
        document.getElementById('aiChatInput').focus();
    }
}

function sendAiMessage() {
    const input = document.getElementById('aiChatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const messages = document.getElementById('aiChatMessages');
    messages.innerHTML += `<div class="user-message">${escapeHtml(msg)}</div>`;
    input.value = '';

    setTimeout(() => {
        const response = getAiResponse(msg);
        messages.innerHTML += response;
        messages.scrollTop = messages.scrollHeight;
    }, 500);

    messages.scrollTop = messages.scrollHeight;
}

function getAiResponse(input) {
    const lower = input.toLowerCase();
    const products = allProducts.filter(p => p.hasStock);

    if (lower.includes('merhaba') || lower.includes('selam') || lower.includes('hey')) {
        return `<div class="ai-message">Merhaba! Size nasıl yardımcı olabilirim? Spor giyim ürünleri arıyorsanız bana ne tür bir ürün istediğinizi söyleyin! 😊</div>`;
    }

    if (lower.includes('tayt') || lower.includes('pantolon') || lower.includes('legging')) {
        const results = products.filter(p => p.name.toLowerCase().includes('tayt') || p.name.toLowerCase().includes('legging') || p.category?.toLowerCase().includes('tayt')).slice(0, 3);
        if (results.length === 0) return `<div class="ai-message">Şu anda tayt ürünümüz bulunmuyor. Farklı bir kategori aramak ister misiniz?</div>`;
        return `<div class="ai-message">${results.length} tayt ürünü buldum:<br>${results.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
    }

    if (lower.includes('atlet') || lower.includes('üst') || lower.includes('tişört')) {
        const results = products.filter(p => p.name.toLowerCase().includes('atlet') || p.name.toLowerCase().includes('tişört') || p.name.toLowerCase().includes('üst') || p.category?.toLowerCase().includes('atlet')).slice(0, 3);
        if (results.length === 0) return `<div class="ai-message">Şu anda atlet ürünümüz bulunmuyor. Başka bir şey aramak ister misiniz?</div>`;
        return `<div class="ai-message">${results.length} atlet/üst ürünü buldum:<br>${results.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
    }

    if (lower.includes('siyah') || lower.includes('renk')) {
        const results = products.filter(p => (p.colors || []).some(c => c.includes('siyah'))).slice(0, 3);
        if (results.length === 0) return `<div class="ai-message">Siyah ürün bulamadım. Farklı bir renk veya ürün aramak ister misiniz?</div>`;
        return `<div class="ai-message">İşte siyah renkli ürünler:<br>${results.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
    }

    if (lower.includes('fiyat') || lower.includes('indirim') || lower.includes('ucuz') || lower.includes('kampanya')) {
        const sorted = [...products].sort((a, b) => a.minPrice - b.minPrice).slice(0, 3);
        return `<div class="ai-message">En uygun fiyatlı ürünler:<br>${sorted.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
    }

    if (lower.includes('en çok') || lower.includes('popüler') || lower.includes('öne çıkan')) {
        const featured = products.filter(p => p.featured || p.campaign).slice(0, 3);
        if (featured.length === 0) {
            const sorted = [...products].sort((a, b) => (b.variants[0]?.regularPrice || 0) - b.minPrice).slice(0, 3);
            return `<div class="ai-message">Popüler ürünler:<br>${sorted.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
        }
        return `<div class="ai-message">Öne çıkan ürünler:<br>${featured.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
    }

    if (lower.includes('beden') || lower.includes('s') || lower.includes('m') || lower.includes('l') || lower.includes('xl')) {
        const sizeMatch = lower.match(/\b(xs|s|m|l|xl|2xl|3xl)\b/i);
        if (sizeMatch) {
            const size = sizeMatch[1].toUpperCase();
            const results = products.filter(p => (p.sizes || []).includes(size)).slice(0, 3);
            if (results.length === 0) return `<div class="ai-message">Maalesef ${size} beden ürün bulunamadı. Farklı bir beden aramak ister misiniz?</div>`;
            return `<div class="ai-message">${size} beden mevcut ürünler:<br>${results.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
        }
    }

    if (lower.includes('kargo') || lower.includes('teslimat')) {
        return `<div class="ai-message">500₺ üzeri siparişlerde ücretsiz kargo! 500₺ altı siparişlerde sabit kargo ücreti uygulanmaktadır. Detaylı bilgi için müşteri hizmetleri ile iletişime geçebilirsiniz.</div>`;
    }

    if (lower.includes('iade') || lower.includes('değişim')) {
        return `<div class="ai-message">İade ve değişim koşullarımız için "Müşteri Hizmetleri" sayfamızı inceleyebilirsiniz. Genellikle 14 gün içinde iade kabul edilmektedir.</div>`;
    }

    if (lower.includes('yardım') || lower.includes('ne yapabilirsin') || lower.includes('neler')) {
        return `<div class="ai-message">Size şu konularda yardımcı olabilirim:<br>• Ürün bulma (tayt, atlet, vb.)<br>• Renk ve beden bazlı arama<br>• Fiyat karşılaştırma<br>• Kampanya bilgileri<br>• Kargo ve iade bilgileri<br><br>Ne aradığınızı yazın, size yardımcı olayım!</div>`;
    }

    const keywordResults = products.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
    ).slice(0, 3);

    if (keywordResults.length > 0) {
        return `<div class="ai-message">Aradığınızla eşleşen ürünler:<br>${keywordResults.map(p => `<span class="product-suggestion" onclick="openProductModal('${p.id}')"><strong>${p.name}</strong><small>${p.brand} - ₺${p.minPrice.toFixed(2)}</small></span>`).join('')}</div>`;
    }

    return `<div class="ai-message">Aradığınız kriterlere uygun ürün bulamadım. Farklı bir arama terimi deneyin veya "yardım" yazarak neler yapabileceğimi öğrenin!</div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        const chatWindow = document.getElementById('aiChatWindow');
        if (chatWindow && chatWindow.style.display !== 'none') {
            toggleAiChat();
        }
    }
});

// Init
fetchXMLFeed();
updateCartCount();
