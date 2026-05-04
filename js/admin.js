const PROXY_URL = 'https://api.allorigins.win/get?url=';

// ===================== INIT =====================
function initAdmin() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showAdminPanel();
    }
}

// ===================== AUTH =====================
function getPassword() {
    return localStorage.getItem('adminPassword') || 'admin123';
}

function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('loginPassword').value;
    if (password === getPassword()) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        document.getElementById('loginError').textContent = 'Yanlış şifre!';
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
}

function showAdminPanel() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    loadFeeds();
    loadDashboard();
}

// ===================== NAVIGATION =====================
function showPage(page, el) {
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (el) el.classList.add('active');

    if (page === 'products') renderAdminProducts();
    if (page === 'dashboard') loadDashboard();
    if (page === 'feeds') loadFeeds();
}

// ===================== TOAST =====================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===================== FEED MANAGEMENT =====================
function getFeeds() {
    const feeds = localStorage.getItem('xmlFeeds');
    return feeds ? JSON.parse(feeds) : [
        {
            id: 'default',
            name: 'GymTayt XML Feed',
            url: 'https://www.ds.gymtayt.com/?a=xml_feed&token=f5847597028457e2dbaa2b5ad717b024bccbb550b4bb5992c6f37a7e2f883102',
            active: true,
            lastLoaded: localStorage.getItem('lastFeedLoad') || null,
            status: 'pending'
        }
    ];
}

function saveFeeds(feeds) {
    localStorage.setItem('xmlFeeds', JSON.stringify(feeds));
}

function loadFeeds() {
    const feeds = getFeeds();
    const container = document.getElementById('feedsContainer');

    if (feeds.length === 0) {
        container.innerHTML = '<p style="color:var(--gray-2);text-align:center;padding:20px">Henüz feed eklenmemiş.</p>';
        return;
    }

    container.innerHTML = feeds.map((feed, index) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${feed.name || 'Feed ' + (index + 1)}</div>
                <div class="url" title="${feed.url}">${feed.url}</div>
            </div>
            <span class="feed-status ${feed.status || 'pending'}">${getStatusText(feed.status)}</span>
            <div class="feed-actions">
                <button class="btn-refresh-sm" onclick="reloadFeed('${feed.id}')">Yenile</button>
                <button class="btn-delete-sm" onclick="removeFeed('${feed.id}')">Sil</button>
            </div>
        </div>
    `).join('');
}

function getStatusText(status) {
    switch(status) {
        case 'loaded': return 'Yüklendi';
        case 'error': return 'Hata';
        case 'loading': return 'Yükleniyor';
        default: return 'Bekliyor';
    }
}

function addFeed() {
    const url = document.getElementById('feedUrlInput').value.trim();
    const name = document.getElementById('feedNameInput').value.trim();
    if (!url) { showToast('URL gerekli!', 'error'); return; }

    const feeds = getFeeds();
    feeds.push({
        id: Date.now().toString(),
        name: name || url.substring(0, 50) + '...',
        url: url,
        active: true,
        lastLoaded: null,
        status: 'pending'
    });
    saveFeeds(feeds);

    document.getElementById('feedUrlInput').value = '';
    document.getElementById('feedNameInput').value = '';
    loadFeeds();
    showToast('Feed eklendi!');
    reloadFeed(feeds[feeds.length - 1].id);
}

function removeFeed(id) {
    if (!confirm('Bu feed\'i silmek istediğinize emin misiniz?')) return;
    let feeds = getFeeds();
    feeds = feeds.filter(f => f.id !== id);
    saveFeeds(feeds);
    loadFeeds();
    showToast('Feed silindi!');
}

async function reloadFeed(id) {
    const feeds = getFeeds();
    const feed = feeds.find(f => f.id === id);
    if (!feed) return;

    feed.status = 'loading';
    saveFeeds(feeds);
    loadFeeds();

    try {
        const response = await fetch(PROXY_URL + encodeURIComponent(feed.url));
        const data = await response.json();

        if (data.contents) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
            const products = parseXMLProducts(xmlDoc);

            // Save products to localStorage
            const existingProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
            // Remove old products from this feed
            const filtered = existingProducts.filter(p => p.feedId !== id);
            // Add new ones
            products.forEach(p => { p.feedId = id; });
            const allProducts = [...filtered, ...products];
            localStorage.setItem('adminProducts', JSON.stringify(allProducts));

            feed.lastLoaded = new Date().toISOString();
            feed.status = 'loaded';
            feed.productCount = products.length;
            localStorage.setItem('lastFeedLoad', feed.lastLoaded);
            saveFeeds(feeds);
            showToast(`${products.length} ürün yüklendi!`);
        } else {
            throw new Error('Empty response');
        }
    } catch (error) {
        feed.status = 'error';
        feed.error = error.message;
        saveFeeds(feeds);
        showToast('Feed yüklenirken hata: ' + error.message, 'error');
    }
    loadFeeds();
    loadDashboard();
}

async function refreshAllFeeds() {
    const feeds = getFeeds();
    showToast('Tüm feed\'ler yenileniyor...', 'info');
    for (const feed of feeds) {
        if (feed.active !== false) {
            await reloadFeed(feed.id);
        }
    }
    showToast('Yenileme tamamlandı!');
}

// ===================== XML PARSER =====================
function parseXMLProducts(xmlDoc) {
    const parents = xmlDoc.querySelectorAll('parent');
    const products = [];

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
        variants.forEach(v => {
            product.variants.push({
                id: getText(v, 'id'),
                sku: getText(v, 'sku'),
                price: parseFloat(getText(v, 'price')),
                regularPrice: parseFloat(getText(v, 'regular_price')),
                stockStatus: getText(v, 'stock_status'),
                stockQty: parseInt(getText(v, 'stock_qty')),
                bed: getAttribute(v, 'attribute', 'Beden'),
                renk: getAttribute(v, 'attribute', 'Renk'),
                image: getText(v, 'image')
            });
        });

        product.minPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.price)) : 0;
        product.hasStock = product.variants.some(v => v.stockStatus === 'instock');
        product.source = 'xml';

        products.push(product);
    });

    return products;
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

// ===================== DASHBOARD =====================
function loadDashboard() {
    const allProducts = getAllProducts();
    const feeds = getFeeds();
    const brands = new Set(allProducts.map(p => p.brand)).size;
    const inStock = allProducts.filter(p => p.hasStock).length;

    document.getElementById('statTotalProducts').textContent = allProducts.length;
    document.getElementById('statInStock').textContent = inStock;
    document.getElementById('statFeedCount').textContent = feeds.length;
    document.getElementById('statBrands').textContent = brands;

    // Feed status
    const container = document.getElementById('feedStatusList');
    if (feeds.length === 0) {
        container.innerHTML = '<p style="color:var(--gray-2)">Feed bulunamadı.</p>';
        return;
    }
    container.innerHTML = feeds.map(feed => `
        <div class="feed-status-item">
            <span class="feed-url" title="${feed.url}">${feed.name || feed.url}</span>
            <span class="feed-status ${feed.status || 'pending'}">${getStatusText(feed.status)}</span>
        </div>
    `).join('');
}

// ===================== PRODUCTS =====================
function getAllProducts() {
    const xmlProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
    const manualProducts = JSON.parse(localStorage.getItem('manualProducts') || '[]');
    return [...xmlProducts, ...manualProducts];
}

let currentAdminPage = 1;
const adminPageSize = 20;

function renderAdminProducts() {
    const allProducts = getAllProducts();
    const search = (document.getElementById('adminSearch')?.value || '').toLowerCase();
    const brandFilter = document.getElementById('adminFilterBrand')?.value || '';
    const statusFilter = document.getElementById('adminFilterStatus')?.value || '';

    let filtered = allProducts.filter(p => {
        if (search && !p.name.toLowerCase().includes(search) && !p.brand.toLowerCase().includes(search)) return false;
        if (brandFilter && p.brand !== brandFilter) return false;
        if (statusFilter === 'instock' && !p.hasStock) return false;
        if (statusFilter === 'outofstock' && p.hasStock) return false;
        if (statusFilter === 'manual' && p.source !== 'manual') return false;
        return true;
    });

    // Update brand filter
    const brandSelect = document.getElementById('adminFilterBrand');
    if (brandSelect) {
        const brands = [...new Set(allProducts.map(p => p.brand))].sort();
        const currentVal = brandSelect.value;
        brandSelect.innerHTML = '<option value="">Tüm Markalar</option>' +
            brands.map(b => `<option value="${b}" ${b === currentVal ? 'selected' : ''}>${b}</option>`).join('');
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / adminPageSize);
    if (currentAdminPage > totalPages) currentAdminPage = 1;
    const start = (currentAdminPage - 1) * adminPageSize;
    const pageProducts = filtered.slice(start, start + adminPageSize);

    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = pageProducts.map(p => `
        <tr>
            <td><img src="${p.mainImage}" alt="" class="product-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><rect fill=%22%23eee%22 width=%2250%22 height=%2250%22/></svg>'"></td>
            <td class="product-name-cell" title="${p.name}">${p.name}</td>
            <td>${p.brand}</td>
            <td>₺${p.minPrice?.toFixed(2) || '0.00'}</td>
            <td>${p.hasStock ? '<span class="feed-status loaded">Stokta</span>' : '<span class="feed-status error">Tükendi</span>'}</td>
            <td><span class="source-badge ${p.source === 'manual' ? 'source-manual' : 'source-xml'}">${p.source === 'manual' ? 'Manuel' : 'XML'}</span></td>
            <td>
                <div class="action-btns">
                    ${p.source === 'manual' ? `<button class="btn-edit" onclick="editProduct('${p.id}')">Düzenle</button>` : ''}
                    <button class="btn-delete" onclick="deleteProduct('${p.id}', '${p.source}')">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Pagination
    const pagination = document.getElementById('productsPagination');
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }

    let paginationHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentAdminPage - 2 && i <= currentAdminPage + 2)) {
            paginationHTML += `<button class="${i === currentAdminPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentAdminPage - 3 || i === currentAdminPage + 3) {
            paginationHTML += `<button disabled>...</button>`;
        }
    }
    pagination.innerHTML = paginationHTML;
}

function goToPage(page) {
    currentAdminPage = page;
    renderAdminProducts();
}

// ===================== ADD PRODUCT =====================
function handleAddProduct(e) {
    e.preventDefault();

    const colors = document.getElementById('newProductColors').value.split(',').map(c => c.trim()).filter(c => c);
    const sizes = document.getElementById('newProductSizes').value.split(',').map(s => s.trim()).filter(s => s);

    const galleryLines = document.getElementById('newProductGallery').value.split('\n').map(l => l.trim()).filter(l => l);

    const product = {
        id: 'manual-' + Date.now(),
        name: document.getElementById('newProductName').value,
        brand: document.getElementById('newProductBrand').value,
        category: document.getElementById('newProductCategory').value,
        categorySlug: document.getElementById('newProductCategory').value.toLowerCase(),
        description: document.getElementById('newProductDescription').value,
        mainImage: document.getElementById('newProductImage').value,
        galleryImages: galleryLines,
        minPrice: parseFloat(document.getElementById('newProductPrice').value),
        hasStock: parseInt(document.getElementById('newProductStock').value) > 0,
        source: 'manual',
        variants: [{
            id: 'mv-' + Date.now(),
            sku: 'MANUAL-' + Date.now(),
            price: parseFloat(document.getElementById('newProductPrice').value),
            regularPrice: parseFloat(document.getElementById('newProductRegularPrice').value) || parseFloat(document.getElementById('newProductPrice').value),
            stockStatus: parseInt(document.getElementById('newProductStock').value) > 0 ? 'instock' : 'outofstock',
            stockQty: parseInt(document.getElementById('newProductStock').value) || 0,
            bed: sizes[0] || '',
            renk: colors[0] || '',
            image: document.getElementById('newProductImage').value
        }],
        colors: colors,
        sizes: sizes
    };

    const manualProducts = JSON.parse(localStorage.getItem('manualProducts') || '[]');
    manualProducts.push(product);
    localStorage.setItem('manualProducts', JSON.stringify(manualProducts));

    showToast('Ürün eklendi!');
    e.target.reset();
}

// ===================== EDIT PRODUCT =====================
function editProduct(id) {
    const allProducts = getAllProducts();
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editName').value = product.name;
    document.getElementById('editBrand').value = product.brand;
    document.getElementById('editCategory').value = product.category || '';
    document.getElementById('editPrice').value = product.minPrice;
    document.getElementById('editRegularPrice').value = product.variants[0]?.regularPrice || product.minPrice;
    document.getElementById('editStock').value = product.variants[0]?.stockQty || 0;
    document.getElementById('editImage').value = product.mainImage || '';
    document.getElementById('editDescription').value = product.description || '';

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function handleEditProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;

    const manualProducts = JSON.parse(localStorage.getItem('manualProducts') || '[]');
    const product = manualProducts.find(p => p.id === id);
    if (!product) { showToast('Ürün bulunamadı!', 'error'); return; }

    product.name = document.getElementById('editName').value;
    product.brand = document.getElementById('editBrand').value;
    product.category = document.getElementById('editCategory').value;
    product.minPrice = parseFloat(document.getElementById('editPrice').value);
    product.mainImage = document.getElementById('editImage').value;
    product.description = document.getElementById('editDescription').value;

    if (product.variants[0]) {
        product.variants[0].price = parseFloat(document.getElementById('editPrice').value);
        product.variants[0].regularPrice = parseFloat(document.getElementById('editRegularPrice').value) || product.minPrice;
        product.variants[0].stockQty = parseInt(document.getElementById('editStock').value) || 0;
        product.variants[0].stockStatus = product.variants[0].stockQty > 0 ? 'instock' : 'outofstock';
    }
    product.hasStock = product.variants[0]?.stockQty > 0;

    localStorage.setItem('manualProducts', JSON.stringify(manualProducts));
    showToast('Ürün güncellendi!');
    closeEditModal();
    renderAdminProducts();
}

// ===================== DELETE PRODUCT =====================
function deleteProduct(id, source) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;

    if (source === 'manual') {
        let manualProducts = JSON.parse(localStorage.getItem('manualProducts') || '[]');
        manualProducts = manualProducts.filter(p => p.id !== id);
        localStorage.setItem('manualProducts', JSON.stringify(manualProducts));
    } else {
        let xmlProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
        xmlProducts = xmlProducts.filter(p => p.id !== id);
        localStorage.setItem('adminProducts', JSON.stringify(xmlProducts));
    }

    showToast('Ürün silindi!');
    renderAdminProducts();
    loadDashboard();
}

// ===================== SETTINGS =====================
function handleChangePassword(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmNewPassword').value;

    if (current !== getPassword()) { showToast('Mevcut şifre yanlış!', 'error'); return; }
    if (newPass !== confirm) { showToast('Yeni şifreler eşleşmiyor!', 'error'); return; }
    if (newPass.length < 4) { showToast('Şifre en az 4 karakter olmalı!', 'error'); return; }

    localStorage.setItem('adminPassword', newPass);
    showToast('Şifre değiştirildi!');
    e.target.reset();
}

function exportData() {
    const data = {
        feeds: getFeeds(),
        xmlProducts: JSON.parse(localStorage.getItem('adminProducts') || '[]'),
        manualProducts: JSON.parse(localStorage.getItem('manualProducts') || '[]'),
        password: localStorage.getItem('adminPassword'),
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtayt-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Veriler dışa aktarıldı!');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);

            if (data.feeds) saveFeeds(data.feeds);
            if (data.xmlProducts) localStorage.setItem('adminProducts', JSON.stringify(data.xmlProducts));
            if (data.manualProducts) localStorage.setItem('manualProducts', JSON.stringify(data.manualProducts));
            if (data.password) localStorage.setItem('adminPassword', data.password);

            showToast('Veriler içe aktarıldı!');
            loadDashboard();
            loadFeeds();
        } catch (error) {
            showToast('Geçersiz dosya!', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllManualProducts() {
    if (!confirm('Tüm manuel eklenen ürünler silinecek. Emin misiniz?')) return;
    localStorage.setItem('manualProducts', '[]');
    showToast('Manuel ürünler temizlendi!');
    loadDashboard();
}

function resetAllData() {
    if (!confirm('TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Emin misiniz?')) return;
    if (!confirm('Gerçekten emin misiniz?')) return;

    localStorage.removeItem('xmlFeeds');
    localStorage.removeItem('adminProducts');
    localStorage.removeItem('manualProducts');
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('lastFeedLoad');
    localStorage.removeItem('cart');

    showToast('Tüm veriler sıfırlandı!', 'info');
    location.reload();
}

// Init
initAdmin();
