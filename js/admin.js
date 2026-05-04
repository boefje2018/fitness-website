const PROXY_URL = 'https://api.allorigins.win/get?url=';

// ===================== INIT =====================
function initAdmin() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showAdminPanel();
    }
}

// ===================== AUTH =====================
function getAdmins() {
    const admins = localStorage.getItem('admins');
    return admins ? JSON.parse(admins) : [{ username: 'admin', password: 'admin123', role: 'super' }];
}

function saveAdmins(admins) {
    localStorage.setItem('admins', JSON.stringify(admins));
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const admins = getAdmins();
    const admin = admins.find(a => a.username === username && a.password === password);
    if (admin) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('currentAdmin', JSON.stringify(admin));
        showAdminPanel();
    } else {
        document.getElementById('loginError').textContent = 'Kullanıcı adı veya şifre hatalı!';
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('currentAdmin');
    location.reload();
}

function showAdminPanel() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    loadDashboard();
    initEditors();
}

// ===================== LANGUAGE SYSTEM =====================
const translations = {
    tr: {
        dashboard: 'Dashboard', feeds: 'XML Feed\'ler', products: 'Ürünler', addProduct: 'Ürün Ekle',
        settings: 'Ayarlar', goToSite: 'Siteye Git', logout: 'Çıkış Yap', totalProducts: 'Toplam Ürün',
        inStock: 'Stokta', totalStock: 'Toplam Stok', feedCount: 'XML Feed', brandCount: 'Marka',
        refreshFeeds: 'Tüm Feed\'leri Yenile', feedStatus: 'Feed Durumu', feedManagement: 'XML Feed Yönetimi',
        addNewFeed: 'Yeni Feed Ekle', existingFeeds: 'Mevcut Feed\'ler', productManagement: 'Ürün Yönetimi',
        manualProduct: 'Manuel Ürün Ekle', campaigns: 'Kampanyalar', banners: 'Banner\'lar',
        blogManagement: 'Blog Yönetimi', contentPages: 'İçerik Sayfaları', memberManagement: 'Üye Yönetimi',
        adminManagement: 'Yönetici Yönetimi', shippingSettings: 'Kargo Ayarları', seoSettings: 'SEO Ayarları',
        contactSettings: 'İletişim Ayarları', statistics: 'İstatistikler', currencySettings: 'Para Birimi',
        promotionCodes: 'Promosyon Kodları', categories: 'Kategori Yönetimi', variants: 'Varyant Yönetimi'
    },
    en: {
        dashboard: 'Dashboard', feeds: 'XML Feeds', products: 'Products', addProduct: 'Add Product',
        settings: 'Settings', goToSite: 'Go to Site', logout: 'Logout', totalProducts: 'Total Products',
        inStock: 'In Stock', totalStock: 'Total Stock', feedCount: 'XML Feed', brandCount: 'Brands',
        refreshFeeds: 'Refresh All Feeds', feedStatus: 'Feed Status', feedManagement: 'XML Feed Management',
        addNewFeed: 'Add New Feed', existingFeeds: 'Existing Feeds', productManagement: 'Product Management',
        manualProduct: 'Add Manual Product', campaigns: 'Campaigns', banners: 'Banners',
        blogManagement: 'Blog Management', contentPages: 'Content Pages', memberManagement: 'Member Management',
        adminManagement: 'Admin Management', shippingSettings: 'Shipping Settings', seoSettings: 'SEO Settings',
        contactSettings: 'Contact Settings', statistics: 'Statistics', currencySettings: 'Currency',
        promotionCodes: 'Promotion Codes', categories: 'Category Management', variants: 'Variant Management'
    }
};

function getCurrentLang() {
    return localStorage.getItem('adminLang') || 'tr';
}

function t(key) {
    const lang = getCurrentLang();
    return translations[lang]?.[key] || translations['tr']?.[key] || key;
}

// ===================== NAVIGATION =====================
function showPage(page, el) {
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    if (el) el.classList.add('active');

    if (page === 'products') renderAdminProducts();
    if (page === 'dashboard') loadDashboard();
    if (page === 'feeds') loadFeeds();
    if (page === 'banners') loadBanners();
    if (page === 'campaigns') loadCampaigns();
    if (page === 'blog') loadBlogPosts();
    if (page === 'content-pages') loadContentPages();
    if (page === 'members') loadMembers();
    if (page === 'admins') loadAdminsList();
    if (page === 'shipping') loadShippingSettings();
    if (page === 'seo') loadSEOs();
    if (page === 'contact') loadContactSettings();
    if (page === 'statistics') loadStatistics();
    if (page === 'promotions') loadPromotions();
    if (page === 'categories') loadCategoriesAdmin();
    if (page === 'feeds') loadXmlSettings();
    if (page === 'settings') loadPaymentSettings();
}

// ===================== TOAST =====================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===================== IMAGE HANDLING =====================
function handleImageUpload(input, targetId) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Sadece görsel dosyası seçebilirsiniz!', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Görsel boyutu 5MB\'dan küçük olmalı!', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById(targetId).value = e.target.result;
        const preview = document.getElementById(targetId + '-preview');
        if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
        showToast('Görsel yüklendi!');
    };
    reader.readAsDataURL(file);
}

function handleGalleryUpload(input) {
    const files = input.files;
    if (!files.length) return;
    const gallery = document.getElementById('newProductGallery');
    const existing = gallery.value ? gallery.value.split('\n').filter(l => l.trim()) : [];
    let loaded = 0;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (validFiles.length === 0) { showToast('Geçerli görsel bulunamadı!', 'error'); return; }
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            existing.push(e.target.result);
            loaded++;
            if (loaded === validFiles.length) {
                gallery.value = existing.join('\n');
                updateGalleryPreviews();
                showToast(`${loaded} görsel eklendi!`);
            }
        };
        reader.readAsDataURL(file);
    });
}

function handleEditGalleryUpload(input) {
    const files = input.files;
    if (!files.length) return;
    const gallery = document.getElementById('editGallery');
    const existing = gallery.value ? gallery.value.split('\n').filter(l => l.trim()) : [];
    let loaded = 0;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            existing.push(e.target.result);
            loaded++;
            if (loaded === validFiles.length) {
                gallery.value = existing.join('\n');
                updateEditGalleryPreviews();
                showToast(`${loaded} görsel eklendi!`);
            }
        };
        reader.readAsDataURL(file);
    });
}

function updateGalleryPreviews() {
    const container = document.getElementById('gallery-previews');
    if (!container) return;
    const lines = document.getElementById('newProductGallery').value.split('\n').filter(l => l.trim());
    container.innerHTML = lines.map((url, i) => `
        <div class="gallery-preview-item"><img src="${url}" onerror="this.style.display='none'"><button onclick="removeGalleryImage(${i})">&times;</button></div>
    `).join('');
}

function updateEditGalleryPreviews() {
    const container = document.getElementById('edit-gallery-previews');
    if (!container) return;
    const lines = document.getElementById('editGallery').value.split('\n').filter(l => l.trim());
    container.innerHTML = lines.map((url, i) => `
        <div class="gallery-preview-item"><img src="${url}" onerror="this.style.display='none'"><button onclick="removeEditGalleryImage(${i})">&times;</button></div>
    `).join('');
}

function removeGalleryImage(index) {
    const gallery = document.getElementById('newProductGallery');
    const lines = gallery.value.split('\n').filter(l => l.trim());
    lines.splice(index, 1);
    gallery.value = lines.join('\n');
    updateGalleryPreviews();
}

function removeEditGalleryImage(index) {
    const gallery = document.getElementById('editGallery');
    const lines = gallery.value.split('\n').filter(l => l.trim());
    lines.splice(index, 1);
    gallery.value = lines.join('\n');
    updateEditGalleryPreviews();
}

// ===================== RICH TEXT EDITORS =====================
function initEditors() {
    if (typeof Quill === 'undefined') return;

    ['newProductDescription', 'editDescription', 'newBlogContent', 'editBlogContent', 'newPageContent', 'editPageContent'].forEach(id => {
        const el = document.getElementById(id + '-editor');
        if (el && !el.querySelector('.ql-toolbar')) {
            const textarea = document.getElementById(id);
            if (textarea) textarea.style.display = 'none';

            const quill = new Quill('#' + id + '-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [['bold', 'italic', 'underline', 'strike'], [{ 'header': [1, 2, 3, false] }], [{ 'color': [] }, { 'background': [] }], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['blockquote', 'code-block', 'link', 'image', 'video'], ['clean']]
                },
                placeholder: 'İçerik yazın...'
            });

            quill.root.innerHTML = textarea?.value || '';
            quill.on('text-change', function() {
                if (textarea) textarea.value = quill.root.innerHTML;
            });
        }
    });
}

// ===================== DASHBOARD =====================
function loadDashboard() {
    const allProducts = getAllProducts();
    const feeds = getFeeds();
    const brands = new Set(allProducts.map(p => p.brand)).size;
    const inStock = allProducts.filter(p => p.hasStock).length;
    const totalStock = allProducts.reduce((sum, p) => sum + (p.stockQty || 0), 0);
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const blogs = JSON.parse(localStorage.getItem('blogPosts') || '[]');

    document.getElementById('statTotalProducts').textContent = allProducts.length;
    document.getElementById('statInStock').textContent = inStock;
    document.getElementById('statTotalStock').textContent = totalStock;
    document.getElementById('statFeedCount').textContent = feeds.length;
    document.getElementById('statBrands').textContent = brands;
    document.getElementById('statOrders').textContent = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('statMembers').textContent = members.length;
    document.getElementById('statBlogPosts').textContent = blogs.length;

    const container = document.getElementById('feedStatusList');
    if (feeds.length === 0) { container.innerHTML = '<p style="color:var(--gray-2)">Feed bulunamadı.</p>'; return; }
    container.innerHTML = feeds.map(feed => `
        <div class="feed-status-item">
            <span class="feed-url">${feed.name || feed.url}</span>
            <span class="feed-status ${feed.status || 'pending'}">${getStatusText(feed.status)}</span>
        </div>
    `).join('');
}

// ===================== FEED MANAGEMENT =====================
function getFeeds() {
    const feeds = localStorage.getItem('xmlFeeds');
    return feeds ? JSON.parse(feeds) : [{
        id: 'default', name: 'GymTayt XML Feed',
        url: 'https://www.ds.gymtayt.com/?a=xml_feed&token=f5847597028457e2dbaa2b5ad717b024bccbb550b4bb5992c6f37a7e2f883102',
        active: true, lastLoaded: localStorage.getItem('lastFeedLoad') || null, status: 'pending'
    }];
}

function saveFeeds(feeds) { localStorage.setItem('xmlFeeds', JSON.stringify(feeds)); }

function loadFeeds() {
    const feeds = getFeeds();
    const container = document.getElementById('feedsContainer');
    if (!container) return;
    if (feeds.length === 0) { container.innerHTML = '<p style="color:var(--gray-2);text-align:center;padding:20px">Henüz feed eklenmemiş.</p>'; return; }
    container.innerHTML = feeds.map((feed, index) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${feed.name || 'Feed ' + (index + 1)}</div>
                <div class="url">${feed.url}</div>
                ${feed.productCount ? `<div style="font-size:0.8rem;color:var(--gray-2)">${feed.productCount} ürün</div>` : ''}
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
    return { loaded: 'Yüklendi', error: 'Hata', loading: 'Yükleniyor' }[status] || 'Bekliyor';
}

function addFeed() {
    const url = document.getElementById('feedUrlInput').value.trim();
    const name = document.getElementById('feedNameInput').value.trim();
    if (!url) { showToast('URL gerekli!', 'error'); return; }
    const feeds = getFeeds();
    feeds.push({ id: Date.now().toString(), name: name || url.substring(0, 50) + '...', url, active: true, lastLoaded: null, status: 'pending' });
    saveFeeds(feeds);
    document.getElementById('feedUrlInput').value = '';
    document.getElementById('feedNameInput').value = '';
    loadFeeds();
    showToast('Feed eklendi!');
    reloadFeed(feeds[feeds.length - 1].id);
}

function removeFeed(id) {
    if (!confirm('Bu feed\'i silmek istediğinize emin misiniz?')) return;
    saveFeeds(getFeeds().filter(f => f.id !== id));
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
            const existingProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
            const filtered = existingProducts.filter(p => p.feedId !== id);
            products.forEach(p => { p.feedId = id; });
            localStorage.setItem('adminProducts', JSON.stringify([...filtered, ...products]));
            feed.lastLoaded = new Date().toISOString();
            feed.status = 'loaded';
            feed.productCount = products.length;
            localStorage.setItem('lastFeedLoad', feed.lastLoaded);
            saveFeeds(feeds);
            showToast(`${products.length} ürün yüklendi!`);
        } else { throw new Error('Empty response'); }
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
    for (const feed of feeds) { if (feed.active !== false) await reloadFeed(feed.id); }
    showToast('Yenileme tamamlandı!');
}

// ===================== XML PARSER =====================
function parseXMLProducts(xmlDoc) {
    const parents = xmlDoc.querySelectorAll('parent');
    const products = [];
    parents.forEach(parent => {
        const product = {
            id: getText(parent, 'item_group_id'), name: getText(parent, 'name'),
            brand: getText(parent, 'brand'), description: getText(parent, 'description'),
            category: getText(parent, 'category'), categorySlug: getCategorySlug(parent),
            mainImage: getText(parent, 'main'), galleryImages: getGalleryImages(parent),
            videoUrl: '', createdAt: getText(parent, 'created_at'), variants: [],
            featured: false, campaign: false, campaignPrice: null
        };
        const variants = parent.querySelectorAll('variant');
        const colors = new Set(); const sizes = new Set();
        variants.forEach(v => {
            const variant = {
                id: getText(v, 'id'), sku: getText(v, 'sku'),
                price: parseFloat(getText(v, 'price')), regularPrice: parseFloat(getText(v, 'regular_price')),
                stockStatus: getText(v, 'stock_status'), stockQty: parseInt(getText(v, 'stock_qty')),
                bed: getAttribute(v, 'attribute', 'Beden'), renk: getAttribute(v, 'attribute', 'Renk'),
                image: getText(v, 'image')
            };
            product.variants.push(variant);
            if (variant.renk) colors.add(variant.renk.toLowerCase());
            if (variant.bed) sizes.add(variant.bed);
        });
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
        product.colors = Array.from(colors);
        product.sizes = Array.from(sizes).sort((a, b) => { const ia = sizeOrder.indexOf(a.toUpperCase()), ib = sizeOrder.indexOf(b.toUpperCase()); return (ia === -1 && ib === -1) ? a.localeCompare(b) : ia === -1 ? 1 : ib === -1 ? -1 : ia - ib; });
        product.minPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.price)) : 0;
        product.hasStock = product.variants.some(v => v.stockStatus === 'instock');
        product.source = 'xml';
        product.stockQty = product.hasStock ? product.variants.reduce((sum, v) => sum + (v.stockStatus === 'instock' ? v.stockQty : 0), 0) : 0;
        product.taxRate = 18;
        products.push(product);
    });
    return products;
}

function getText(parent, tag) { const el = parent.querySelector(tag); return el ? el.textContent.trim() : ''; }
function getCategorySlug(parent) { const cat = parent.querySelector('category'); return cat ? cat.getAttribute('slug') : ''; }
function getAttribute(parent, tag, name) { const attrs = parent.querySelectorAll(tag); for (const attr of attrs) { if (attr.getAttribute('name') === name) return attr.textContent.trim(); } return ''; }
function getGalleryImages(parent) { return Array.from(parent.querySelectorAll('gallery image')).map(img => img.textContent.trim()); }

// ===================== PRODUCTS =====================
function getAllProducts() {
    const xml = JSON.parse(localStorage.getItem('adminProducts') || '[]');
    const manual = JSON.parse(localStorage.getItem('manualProducts') || '[]');
    return [...xml, ...manual];
}

function saveAllProducts(products) {
    localStorage.setItem('allProductsCache', JSON.stringify(products));
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

    const brandSelect = document.getElementById('adminFilterBrand');
    if (brandSelect) {
        const brands = [...new Set(allProducts.map(p => p.brand))].sort();
        const currentVal = brandSelect.value;
        brandSelect.innerHTML = '<option value="">Tüm Markalar</option>' + brands.map(b => `<option value="${b}" ${b === currentVal ? 'selected' : ''}>${b}</option>`).join('');
    }

    const totalPages = Math.ceil(filtered.length / adminPageSize);
    if (currentAdminPage > totalPages) currentAdminPage = 1;
    const start = (currentAdminPage - 1) * adminPageSize;
    const pageProducts = filtered.slice(start, start + adminPageSize);

    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = pageProducts.map(p => `
        <tr>
            <td><img src="${p.mainImage || ''}" class="product-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><rect fill=%22%23eee%22 width=%2250%22 height=%2250%22/></svg>'"></td>
            <td class="product-name-cell">${p.name}</td>
            <td>${p.brand}</td>
            <td>₺${(p.minPrice || 0).toFixed(2)}${p.campaignPrice ? `<br><span style="color:var(--danger);font-size:0.8rem">Kampanya: ₺${p.campaignPrice}</span>` : ''}</td>
            <td><span>${p.stockQty || 0}</span> ${p.hasStock ? '<span class="feed-status loaded" style="margin-left:5px">Stokta</span>' : '<span class="feed-status error" style="margin-left:5px">Tükendi</span>'}</td>
            <td><small>${(p.colors || []).length} renk, ${(p.sizes || []).length} beden</small></td>
            <td><span class="source-badge ${p.source === 'manual' ? 'source-manual' : 'source-xml'}">${p.source === 'manual' ? 'Manuel' : 'XML'}</span></td>
            <td>
                <div class="action-btns">
                    ${p.source === 'manual' ? `<button class="btn-edit" onclick="editProduct('${p.id}')">Düzenle</button>` : ''}
                    <button class="btn-delete" onclick="deleteProduct('${p.id}','${p.source}')">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');

    const pagination = document.getElementById('productsPagination');
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentAdminPage - 2 && i <= currentAdminPage + 2)) {
            html += `<button class="${i === currentAdminPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentAdminPage - 3 || i === currentAdminPage + 3) { html += '<button disabled>...</button>'; }
    }
    pagination.innerHTML = html;
}

function goToPage(page) { currentAdminPage = page; renderAdminProducts(); }

// ===================== ADD/EDIT PRODUCT =====================
function handleAddProduct(e) {
    e.preventDefault();
    const colorsInput = document.getElementById('newProductColors').value.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
    const sizesInput = document.getElementById('newProductSizes').value.split(',').map(s => s.trim()).filter(s => s);
    const galleryLines = document.getElementById('newProductGallery').value.split('\n').map(l => l.trim()).filter(l => l);
    const variants = [];
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const stock = parseInt(document.getElementById('newProductStock').value) || 0;

    if (colorsInput.length > 0 && sizesInput.length > 0) {
        colorsInput.forEach(color => {
            sizesInput.forEach(size => {
                variants.push({ id: 'mv-' + Date.now() + '-' + color + '-' + size, sku: 'MANUAL-' + Date.now(), price, regularPrice: parseFloat(document.getElementById('newProductRegularPrice').value) || price, stockStatus: stock > 0 ? 'instock' : 'outofstock', stockQty: stock, bed: size, renk: color, image: document.getElementById('newProductImage').value });
            });
        });
    } else {
        variants.push({ id: 'mv-' + Date.now(), sku: 'MANUAL-' + Date.now(), price, regularPrice: parseFloat(document.getElementById('newProductRegularPrice').value) || price, stockStatus: stock > 0 ? 'instock' : 'outofstock', stockQty: stock, bed: sizesInput[0] || '', renk: colorsInput[0] || '', image: document.getElementById('newProductImage').value });
    }

    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
    const sortedSizes = [...sizesInput].sort((a, b) => { const ia = sizeOrder.indexOf(a.toUpperCase()), ib = sizeOrder.indexOf(b.toUpperCase()); return (ia === -1 && ib === -1) ? a.localeCompare(b) : ia === -1 ? 1 : ib === -1 ? -1 : ia - ib; });

    const product = {
        id: 'manual-' + Date.now(), name: document.getElementById('newProductName').value,
        brand: document.getElementById('newProductBrand').value, category: document.getElementById('newProductCategory').value,
        categorySlug: document.getElementById('newProductCategory').value.toLowerCase(),
        description: document.getElementById('newProductDescription').value,
        mainImage: document.getElementById('newProductImage').value, galleryImages: galleryLines,
        videoUrl: document.getElementById('newProductVideo').value.trim(),
        minPrice: price, hasStock: stock > 0, stockQty: stock, source: 'manual',
        variants, colors: colorsInput, sizes: sortedSizes,
        featured: document.getElementById('newProductFeatured')?.checked || false,
        campaign: document.getElementById('newProductCampaign')?.checked || false,
        campaignPrice: parseFloat(document.getElementById('newProductCampaignPrice')?.value) || null,
        taxRate: parseFloat(document.getElementById('newProductTax')?.value) || 18
    };

    const manualProducts = JSON.parse(localStorage.getItem('manualProducts') || '[]');
    manualProducts.push(product);
    localStorage.setItem('manualProducts', JSON.stringify(manualProducts));
    showToast('Ürün eklendi!');
    e.target.reset();
    document.getElementById('gallery-previews').innerHTML = '';
    document.getElementById('newProductImage-preview').style.display = 'none';
    if (window.newQuill) window.newQuill.setText('');
}

function editProduct(id) {
    const product = getAllProducts().find(p => p.id === id);
    if (!product) return;
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editName').value = product.name;
    document.getElementById('editBrand').value = product.brand;
    document.getElementById('editCategory').value = product.category || '';
    document.getElementById('editPrice').value = product.minPrice || 0;
    document.getElementById('editRegularPrice').value = product.variants[0]?.regularPrice || product.minPrice;
    document.getElementById('editStock').value = product.variants[0]?.stockQty || 0;
    document.getElementById('editImage').value = product.mainImage || '';
    document.getElementById('editVideo').value = product.videoUrl || '';
    document.getElementById('editTax').value = product.taxRate || 18;
    document.getElementById('editFeatured').checked = product.featured || false;
    document.getElementById('editCampaign').checked = product.campaign || false;
    document.getElementById('editCampaignPrice').value = product.campaignPrice || '';
    if (window.editQuill) { window.editQuill.root.innerHTML = product.description || ''; }
    else { document.getElementById('editDescription').value = product.description || ''; }
    document.getElementById('editGallery').value = (product.galleryImages || []).join('\n');
    updateEditGalleryPreviews();
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

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
    product.videoUrl = document.getElementById('editVideo').value;
    product.description = document.getElementById('editDescription').value;
    product.galleryImages = document.getElementById('editGallery').value.split('\n').filter(l => l.trim());
    product.taxRate = parseFloat(document.getElementById('editTax').value) || 18;
    product.featured = document.getElementById('editFeatured').checked;
    product.campaign = document.getElementById('editCampaign').checked;
    product.campaignPrice = parseFloat(document.getElementById('editCampaignPrice').value) || null;

    if (product.variants[0]) {
        product.variants[0].price = product.minPrice;
        product.variants[0].regularPrice = parseFloat(document.getElementById('editRegularPrice').value) || product.minPrice;
        product.variants[0].stockQty = parseInt(document.getElementById('editStock').value) || 0;
        product.variants[0].stockStatus = product.variants[0].stockQty > 0 ? 'instock' : 'outofstock';
    }
    product.hasStock = product.variants[0]?.stockQty > 0;
    product.stockQty = product.variants[0]?.stockQty || 0;

    localStorage.setItem('manualProducts', JSON.stringify(manualProducts));
    showToast('Ürün güncellendi!');
    closeEditModal();
    renderAdminProducts();
}

function deleteProduct(id, source) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    if (source === 'manual') {
        let mp = JSON.parse(localStorage.getItem('manualProducts') || '[]');
        localStorage.setItem('manualProducts', JSON.stringify(mp.filter(p => p.id !== id)));
    } else {
        let xp = JSON.parse(localStorage.getItem('adminProducts') || '[]');
        localStorage.setItem('adminProducts', JSON.stringify(xp.filter(p => p.id !== id)));
    }
    showToast('Ürün silindi!');
    renderAdminProducts();
    loadDashboard();
}

// ===================== BANNERS =====================
function getBanners() { return JSON.parse(localStorage.getItem('banners') || '[]'); }
function saveBanners(b) { localStorage.setItem('banners', JSON.stringify(b)); }

function loadBanners() {
    const banners = getBanners();
    const container = document.getElementById('bannersList');
    if (!container) return;
    container.innerHTML = banners.map((b, i) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${b.title || 'Banner ' + (i + 1)}</div>
                <img src="${b.image}" style="max-width:200px;border-radius:8px;margin-top:5px" onerror="this.style.display='none'">
            </div>
            <div class="feed-actions">
                <button class="btn-edit" onclick="editBanner(${i})">Düzenle</button>
                <button class="btn-delete-sm" onclick="deleteBanner(${i})">Sil</button>
            </div>
        </div>
    `).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">Banner yok.</p>';
}

function addBanner() {
    const title = document.getElementById('bannerTitle').value;
    const image = document.getElementById('bannerImage').value;
    const link = document.getElementById('bannerLink').value;
    if (!image) { showToast('Görsel gerekli!', 'error'); return; }
    const banners = getBanners();
    banners.push({ title, image, link, active: true });
    saveBanners(banners);
    document.getElementById('bannerTitle').value = '';
    document.getElementById('bannerImage').value = '';
    document.getElementById('bannerLink').value = '';
    document.getElementById('bannerImage-preview').style.display = 'none';
    loadBanners();
    showToast('Banner eklendi!');
}

function editBanner(index) {
    const banners = getBanners();
    const b = banners[index];
    const newTitle = prompt('Banner başlığı:', b.title) || b.title;
    const newLink = prompt('Banner linki:', b.link) || b.link;
    banners[index] = { ...b, title: newTitle, link: newLink };
    saveBanners(banners);
    loadBanners();
}

function deleteBanner(index) {
    if (!confirm('Bu banner\'ı silmek istediğinize emin misiniz?')) return;
    const banners = getBanners();
    banners.splice(index, 1);
    saveBanners(banners);
    loadBanners();
    showToast('Banner silindi!');
}

// ===================== CAMPAIGNS =====================
function getCampaigns() { return JSON.parse(localStorage.getItem('campaigns') || '[]'); }
function saveCampaigns(c) { localStorage.setItem('campaigns', JSON.stringify(c)); }

function loadCampaigns() {
    const campaigns = getCampaigns();
    const container = document.getElementById('campaignsList');
    if (!container) return;
    const products = getAllProducts();
    container.innerHTML = campaigns.map((c, i) => {
        const product = products.find(p => p.id === c.productId);
        return `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${product?.name || 'Ürün bulunamadı'}</div>
                <div>Normal: ₺${product?.minPrice || 0} → Kampanya: ₺${c.discountPrice}</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">${c.startDate ? new Date(c.startDate).toLocaleDateString() : ''} - ${c.endDate ? new Date(c.endDate).toLocaleDateString() : ''}</div>
            </div>
            <div class="feed-actions">
                <button class="btn-delete-sm" onclick="deleteCampaign(${i})">Sil</button>
            </div>
        </div>`;
    }).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">Kampanya yok.</p>';

    // Update product select
    const select = document.getElementById('campaignProductSelect');
    if (select) {
        select.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (₺${p.minPrice})</option>`).join('');
    }
}

function addCampaign() {
    const productId = document.getElementById('campaignProductSelect').value;
    const discountPrice = parseFloat(document.getElementById('campaignDiscountPrice').value);
    const startDate = document.getElementById('campaignStartDate').value;
    const endDate = document.getElementById('campaignEndDate').value;
    if (!productId || !discountPrice) { showToast('Ürün ve indirim fiyatı gerekli!', 'error'); return; }

    const campaigns = getCampaigns();
    campaigns.push({ productId, discountPrice, startDate, endDate });
    saveCampaigns(campaigns);

    // Update product
    const products = getAllProducts();
    const product = products.find(p => p.id === productId);
    if (product) { product.campaign = true; product.campaignPrice = discountPrice; }
    if (product?.source === 'manual') localStorage.setItem('manualProducts', JSON.stringify(products.filter(p => p.source === 'manual')));

    document.getElementById('campaignDiscountPrice').value = '';
    loadCampaigns();
    showToast('Kampanya eklendi!');
}

function deleteCampaign(index) {
    const campaigns = getCampaigns();
    const productId = campaigns[index].productId;
    const products = getAllProducts();
    const product = products.find(p => p.id === productId);
    if (product) { product.campaign = false; product.campaignPrice = null; }
    if (product?.source === 'manual') localStorage.setItem('manualProducts', JSON.stringify(products.filter(p => p.source === 'manual')));

    campaigns.splice(index, 1);
    saveCampaigns(campaigns);
    loadCampaigns();
    showToast('Kampanya silindi!');
}

// ===================== BLOG =====================
function getBlogPosts() { return JSON.parse(localStorage.getItem('blogPosts') || '[]'); }
function saveBlogPosts(p) { localStorage.setItem('blogPosts', JSON.stringify(p)); }

function loadBlogPosts() {
    const posts = getBlogPosts();
    const container = document.getElementById('blogPostsList');
    if (!container) return;
    container.innerHTML = posts.map((p, i) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${p.title}</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">${new Date(p.date).toLocaleDateString()}</div>
            </div>
            <div class="feed-actions">
                <button class="btn-edit" onclick="editBlogPost(${i})">Düzenle</button>
                <button class="btn-delete-sm" onclick="deleteBlogPost(${i})">Sil</button>
            </div>
        </div>
    `).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">Blog yazısı yok.</p>';
}

function handleAddBlogPost(e) {
    e.preventDefault();
    const posts = getBlogPosts();
    posts.push({
        id: 'blog-' + Date.now(),
        title: document.getElementById('newBlogTitle').value,
        content: document.getElementById('newBlogContent').value,
        image: document.getElementById('newBlogImage').value,
        date: new Date().toISOString()
    });
    saveBlogPosts(posts);
    showToast('Blog yazısı eklendi!');
    e.target.reset();
    if (window.blogQuill) window.blogQuill.setText('');
    loadBlogPosts();
}

function editBlogPost(index) {
    const posts = getBlogPosts();
    const p = posts[index];
    const newTitle = prompt('Başlık:', p.title);
    if (newTitle) {
        posts[index].title = newTitle;
        saveBlogPosts(posts);
        loadBlogPosts();
    }
}

function deleteBlogPost(index) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    const posts = getBlogPosts();
    posts.splice(index, 1);
    saveBlogPosts(posts);
    loadBlogPosts();
    showToast('Blog yazısı silindi!');
}

// ===================== CONTENT PAGES =====================
function getContentPages() { return JSON.parse(localStorage.getItem('contentPages') || '[]'); }
function saveContentPages(p) { localStorage.setItem('contentPages', JSON.stringify(p)); }

function loadContentPages() {
    const pages = getContentPages();
    const container = document.getElementById('contentPagesList');
    if (!container) return;
    container.innerHTML = pages.map((p, i) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${p.title}</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">Slug: ${p.slug}</div>
            </div>
            <div class="feed-actions">
                <button class="btn-edit" onclick="editContentPage(${i})">Düzenle</button>
                <button class="btn-delete-sm" onclick="deleteContentPage(${i})">Sil</button>
            </div>
        </div>
    `).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">İçerik sayfası yok.</p>';
}

function handleAddContentPage(e) {
    e.preventDefault();
    const pages = getContentPages();
    pages.push({
        id: 'page-' + Date.now(),
        title: document.getElementById('newPageTitle').value,
        slug: document.getElementById('newPageSlug').value,
        content: document.getElementById('newPageContent').value
    });
    saveContentPages(pages);
    showToast('Sayfa eklendi!');
    e.target.reset();
    loadContentPages();
}

function editContentPage(index) {
    const pages = getContentPages();
    const p = pages[index];
    const newContent = prompt('İçerik:', p.content.substring(0, 100) + '...');
    if (newContent) { pages[index].content = newContent; saveContentPages(pages); loadContentPages(); }
}

function deleteContentPage(index) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    const pages = getContentPages();
    pages.splice(index, 1);
    saveContentPages(pages);
    loadContentPages();
    showToast('Sayfa silindi!');
}

// ===================== MEMBERS =====================
function getMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(m) { localStorage.setItem('members', JSON.stringify(m)); }

function loadMembers() {
    const members = getMembers();
    const container = document.getElementById('membersList');
    if (!container) return;
    container.innerHTML = members.map((m, i) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${m.name} (${m.email})</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">Grup: ${m.group || 'Standart'} | Kayıt: ${new Date(m.date).toLocaleDateString()}</div>
            </div>
            <div class="feed-actions">
                <button class="btn-delete-sm" onclick="deleteMember(${i})">Sil</button>
            </div>
        </div>
    `).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">Üye yok.</p>';
}

function deleteMember(index) {
    if (!confirm('Üyeyi silmek istediğinize emin misiniz?')) return;
    const members = getMembers();
    members.splice(index, 1);
    saveMembers(members);
    loadMembers();
}

// ===================== ADMINS =====================
function loadAdminsList() {
    const admins = getAdmins();
    const container = document.getElementById('adminsList');
    if (!container) return;
    container.innerHTML = admins.map((a, i) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${a.username}</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">Rol: ${a.role === 'super' ? 'Süper Admin' : a.role}</div>
            </div>
            ${i > 0 ? `<div class="feed-actions"><button class="btn-delete-sm" onclick="deleteAdmin(${i})">Sil</button></div>` : '<span style="color:var(--gray-2);font-size:0.8rem">Ana yönetici</span>'}
        </div>
    `).join('');
}

function addAdmin() {
    const username = document.getElementById('newAdminUsername').value;
    const password = document.getElementById('newAdminPassword').value;
    const role = document.getElementById('newAdminRole').value;
    if (!username || !password) { showToast('Kullanıcı adı ve şifre gerekli!', 'error'); return; }
    const admins = getAdmins();
    if (admins.find(a => a.username === username)) { showToast('Bu kullanıcı adı zaten var!', 'error'); return; }
    admins.push({ username, password, role });
    saveAdmins(admins);
    document.getElementById('newAdminUsername').value = '';
    document.getElementById('newAdminPassword').value = '';
    loadAdminsList();
    showToast('Yönetici eklendi!');
}

function deleteAdmin(index) {
    if (!confirm('Bu yöneticiyi silmek istediğinize emin misiniz?')) return;
    const admins = getAdmins();
    admins.splice(index, 1);
    saveAdmins(admins);
    loadAdminsList();
}

// ===================== SHIPPING =====================
function getShippingSettings() {
    return JSON.parse(localStorage.getItem('shippingSettings') || JSON.stringify({
        mode: 'fixed',
        fixedPrice: 50,
        freeThreshold: 500,
        weightRates: []
    }));
}
function saveShippingSettings(s) { localStorage.setItem('shippingSettings', JSON.stringify(s)); }

function loadShippingSettings() {
    const settings = getShippingSettings();
    document.getElementById('shippingMode').value = settings.mode;
    document.getElementById('fixedPrice').value = settings.fixedPrice;
    document.getElementById('freeThreshold').value = settings.freeThreshold;
}

function saveShipping() {
    const settings = {
        mode: document.getElementById('shippingMode').value,
        fixedPrice: parseFloat(document.getElementById('fixedPrice').value) || 0,
        freeThreshold: parseFloat(document.getElementById('freeThreshold').value) || 0,
        weightRates: []
    };
    saveShippingSettings(settings);
    showToast('Kargo ayarları kaydedildi!');
}

// ===================== SEO =====================
function getSEO() { return JSON.parse(localStorage.getItem('seoSettings') || '{}'); }
function saveSEO(s) { localStorage.setItem('seoSettings', JSON.stringify(s)); }

function loadSEOs() {
    const seo = getSEO();
    document.getElementById('seoTitle').value = seo.title || '';
    document.getElementById('seoDescription').value = seo.description || '';
    document.getElementById('seoKeywords').value = seo.keywords || '';
    document.getElementById('seoOgImage').value = seo.ogImage || '';
}

function saveSEOSettings() {
    saveSEO({
        title: document.getElementById('seoTitle').value,
        description: document.getElementById('seoDescription').value,
        keywords: document.getElementById('seoKeywords').value,
        ogImage: document.getElementById('seoOgImage').value
    });
    showToast('SEO ayarları kaydedildi!');
}

// ===================== CONTACT =====================
function getContactSettings() { return JSON.parse(localStorage.getItem('contactSettings') || '{}'); }
function saveContactSettings(s) { localStorage.setItem('contactSettings', JSON.stringify(s)); }

function loadContactSettings() {
    const contact = getContactSettings();
    document.getElementById('contactPhone').value = contact.phone || '';
    document.getElementById('contactEmail').value = contact.email || '';
    document.getElementById('contactAddress').value = contact.address || '';
    document.getElementById('contactInstagram').value = contact.instagram || '';
    document.getElementById('contactFacebook').value = contact.facebook || '';
    document.getElementById('contactTwitter').value = contact.twitter || '';
    document.getElementById('contactWhatsapp').value = contact.whatsapp || '';
}

function saveContact() {
    saveContactSettings({
        phone: document.getElementById('contactPhone').value,
        email: document.getElementById('contactEmail').value,
        address: document.getElementById('contactAddress').value,
        instagram: document.getElementById('contactInstagram').value,
        facebook: document.getElementById('contactFacebook').value,
        twitter: document.getElementById('contactTwitter').value,
        whatsapp: document.getElementById('contactWhatsapp').value
    });
    showToast('İletişim ayarları kaydedildi!');
}

// ===================== STATISTICS =====================
function loadStatistics() {
    const products = getAllProducts();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const members = getMembers();
    const visits = parseInt(localStorage.getItem('siteVisits') || '0');
    const totalRevenue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('statVisits').textContent = visits;
    document.getElementById('statCartItems').textContent = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('statRevenue').textContent = '₺' + totalRevenue.toFixed(2);
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statMembersStats').textContent = members.length;
}

// ===================== PROMOTIONS =====================
function getPromotions() { return JSON.parse(localStorage.getItem('promotions') || '[]'); }
function savePromotions(p) { localStorage.setItem('promotions', JSON.stringify(p)); }

function loadPromotions() {
    const promos = getPromotions();
    const container = document.getElementById('promotionsList');
    if (!container) return;
    container.innerHTML = promos.map((p, i) => `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${p.code}</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">${p.type === 'percent' ? '%' + p.value + ' indirim' : '₺' + p.value + ' indirim'} ${p.minOrder ? '(min ₺' + p.minOrder + ')' : ''}</div>
            </div>
            <div class="feed-actions">
                <button class="btn-delete-sm" onclick="deletePromotion(${i})">Sil</button>
            </div>
        </div>
    `).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">Promosyon kodu yok.</p>';
}

function addPromotion() {
    const code = document.getElementById('promoCode').value.toUpperCase();
    const type = document.getElementById('promoType').value;
    const value = parseFloat(document.getElementById('promoValue').value);
    const minOrder = parseFloat(document.getElementById('promoMinOrder').value) || 0;
    if (!code || !value) { showToast('Kod ve değer gerekli!', 'error'); return; }
    const promos = getPromotions();
    promos.push({ code, type, value, minOrder, active: true });
    savePromotions(promos);
    document.getElementById('promoCode').value = '';
    document.getElementById('promoValue').value = '';
    document.getElementById('promoMinOrder').value = '';
    loadPromotions();
    showToast('Promosyon kodu eklendi!');
}

function deletePromotion(index) {
    const promos = getPromotions();
    promos.splice(index, 1);
    savePromotions(promos);
    loadPromotions();
}

// ===================== CATEGORIES =====================
function getCategories() { return JSON.parse(localStorage.getItem('categories') || '[]'); }
function saveCategories(c) { localStorage.setItem('categories', JSON.stringify(c)); }

function loadCategoriesAdmin() {
    const categories = getCategories();
    const container = document.getElementById('categoriesList');
    if (!container) return;
    const allProducts = getAllProducts();
    container.innerHTML = categories.map((c, i) => {
        const count = allProducts.filter(p => p.categorySlug === c.slug || p.category === c.name).length;
        return `
        <div class="feed-item">
            <div class="feed-info">
                <div class="name">${c.name}</div>
                <div style="font-size:0.8rem;color:var(--gray-2)">${count} ürün</div>
            </div>
            <div class="feed-actions">
                <button class="btn-edit" onclick="editCategory(${i})">Düzenle</button>
                <button class="btn-delete-sm" onclick="deleteCategory(${i})">Sil</button>
            </div>
        </div>`;
    }).join('') || '<p style="color:var(--gray-2);text-align:center;padding:20px">Kategori yok.</p>';
}

function addCategory() {
    const name = document.getElementById('newCategoryName').value;
    const slug = document.getElementById('newCategorySlug').value || name.toLowerCase().replace(/\s+/g, '-');
    if (!name) { showToast('Kategori adı gerekli!', 'error'); return; }
    const categories = getCategories();
    categories.push({ name, slug, image: document.getElementById('newCategoryImage').value });
    saveCategories(categories);
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategorySlug').value = '';
    document.getElementById('newCategoryImage').value = '';
    loadCategoriesAdmin();
    showToast('Kategori eklendi!');
}

function editCategory(index) {
    const categories = getCategories();
    const c = categories[index];
    const newName = prompt('Kategori adı:', c.name);
    if (newName) {
        categories[index].name = newName;
        categories[index].slug = document.getElementById('newCategorySlug')?.value || newName.toLowerCase().replace(/\s+/g, '-');
        saveCategories(categories);
        loadCategoriesAdmin();
    }
}

function deleteCategory(index) {
    if (!confirm('Kategoriyi silmek istediğinize emin misiniz?')) return;
    const categories = getCategories();
    categories.splice(index, 1);
    saveCategories(categories);
    loadCategoriesAdmin();
}

// ===================== SETTINGS =====================
function handleChangePassword(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmNewPassword').value;
    const admins = getAdmins();
    const admin = admins.find(a => a.username === JSON.parse(sessionStorage.getItem('currentAdmin') || '{}').username);
    if (admin?.password !== current) { showToast('Mevcut şifre yanlış!', 'error'); return; }
    if (newPass !== confirm) { showToast('Yeni şifreler eşleşmiyor!', 'error'); return; }
    if (newPass.length < 4) { showToast('Şifre en az 4 karakter olmalı!', 'error'); return; }
    admin.password = newPass;
    saveAdmins(admins);
    showToast('Şifre değiştirildi!');
    e.target.reset();
}

function changeLanguage(lang) {
    localStorage.setItem('adminLang', lang);
    showToast('Dil değiştirildi!');
}

function exportData() {
    const data = {
        feeds: getFeeds(), adminProducts: JSON.parse(localStorage.getItem('adminProducts') || '[]'),
        manualProducts: JSON.parse(localStorage.getItem('manualProducts') || '[]'),
        admins: getAdmins(), banners: getBanners(), campaigns: getCampaigns(),
        blogPosts: getBlogPosts(), contentPages: getContentPages(), members: getMembers(),
        shippingSettings: getShippingSettings(), seoSettings: getSEO(),
        contactSettings: getContactSettings(), promotions: getPromotions(),
        categories: getCategories(), adminLang: getCurrentLang(),
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtayt-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
            if (data.adminProducts) localStorage.setItem('adminProducts', JSON.stringify(data.adminProducts));
            if (data.manualProducts) localStorage.setItem('manualProducts', JSON.stringify(data.manualProducts));
            if (data.admins) saveAdmins(data.admins);
            if (data.banners) saveBanners(data.banners);
            if (data.campaigns) saveCampaigns(data.campaigns);
            if (data.blogPosts) saveBlogPosts(data.blogPosts);
            if (data.contentPages) saveContentPages(data.contentPages);
            if (data.members) saveMembers(data.members);
            if (data.shippingSettings) saveShippingSettings(data.shippingSettings);
            if (data.seoSettings) saveSEO(data.seoSettings);
            if (data.contactSettings) saveContactSettings(data.contactSettings);
            if (data.promotions) savePromotions(data.promotions);
            if (data.categories) saveCategories(data.categories);
            showToast('Veriler içe aktarıldı!');
            loadDashboard();
        } catch (error) { showToast('Geçersiz dosya!', 'error'); }
    };
    reader.readAsText(file);
}

function clearAllManualProducts() {
    if (!confirm('Tüm manuel ürünler silinecek. Emin misiniz?')) return;
    localStorage.setItem('manualProducts', '[]');
    showToast('Manuel ürünler temizlendi!');
    loadDashboard();
}

function resetAllData() {
    if (!confirm('TÜM VERİLER SİLİNECEK! Emin misiniz?')) return;
    if (!confirm('Gerçekten emin misiniz?')) return;
    const keys = ['xmlFeeds', 'adminProducts', 'manualProducts', 'admins', 'banners', 'campaigns', 'blogPosts', 'contentPages', 'members', 'shippingSettings', 'seoSettings', 'contactSettings', 'promotions', 'categories', 'cart', 'adminPassword', 'lastFeedLoad'];
    keys.forEach(k => localStorage.removeItem(k));
    showToast('Tüm veriler sıfırlandı!', 'info');
    location.reload();
}

// Export functions for Excel
function exportToExcel(type) {
    const products = getAllProducts();
    let csv = '';

    if (type === 'products') {
        csv = 'ID,Ad,Marka,Kategori,Fiyat,Stok,Renkler,Bedenler\n';
        products.forEach(p => {
            csv += `${p.id},"${p.name}",${p.brand},${p.category || ''},${p.minPrice},${p.stockQty},"${(p.colors || []).join(', ')}","${(p.sizes || []).join(', ')}"\n`;
        });
    } else if (type === 'members') {
        const members = getMembers();
        csv = 'Ad,Email,Telefon,Grup,Kayıt Tarihi\n';
        members.forEach(m => {
            csv += `"${m.name}","${m.email}","${m.phone || ''}","${m.group || 'Standart'}","${new Date(m.date).toLocaleDateString()}"\n`;
        });
    }

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Excel dosyası indirildi!');
}

// XML export
function exportToXML() {
    const products = getAllProducts();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n';
    products.forEach(p => {
        xml += `  <product>\n`;
        xml += `    <id>${p.id}</id>\n<name>${p.name}</name>\n<brand>${p.brand}</brand>\n`;
        xml += `    <price>${p.minPrice}</price>\n<stock>${p.stockQty}</stock>\n`;
        xml += `    <category>${p.category || ''}</category>\n<description><![CDATA[${p.description || ''}]]></description>\n`;
        xml += `    <image>${p.mainImage || ''}</image>\n`;
        xml += `  </product>\n`;
    });
    xml += '</products>';

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('XML dosyası indirildi!');
}

// ===================== XML FORMAT SETTINGS =====================
function getXmlSettings() {
    return JSON.parse(localStorage.getItem('xmlSettings') || JSON.stringify({
        format: 'standard',
        scope: 'all'
    }));
}

function saveXmlSettings() {
    const format = document.querySelector('input[name="xmlFormat"]:checked')?.value || 'standard';
    const scope = document.querySelector('input[name="xmlScope"]:checked')?.value || 'all';
    localStorage.setItem('xmlSettings', JSON.stringify({ format, scope }));
    showToast('XML ayarları kaydedildi!');
}

function loadXmlSettings() {
    const settings = getXmlSettings();
    const formatRadio = document.querySelector(`input[name="xmlFormat"][value="${settings.format}"]`);
    const scopeRadio = document.querySelector(`input[name="xmlScope"][value="${settings.scope}"]`);
    if (formatRadio) formatRadio.checked = true;
    if (scopeRadio) scopeRadio.checked = true;
}

function getProductsForExport() {
    let products = getAllProducts();
    const settings = getXmlSettings();
    if (settings.scope === 'pod') {
        products = products.filter(p => p.category?.toLowerCase().includes('pod') || p.name?.toLowerCase().includes('pod') || (p.description || '').toLowerCase().includes('print on demand'));
    }
    return products;
}

function exportSelectedXml() {
    const settings = getXmlSettings();
    const products = getProductsForExport();
    let xml = '';

    switch (settings.format) {
        case 'standard':
            xml = exportStandardXml(products);
            break;
        case 'stockmount':
            xml = exportStockMountXml(products);
            break;
        case 'ticimax':
            xml = exportTicimaxXml(products);
            break;
        case 'ideasoft':
            xml = exportIdeaSoftXml(products);
            break;
    }

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feed-${settings.format}-${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${settings.format.toUpperCase()} formatında ${products.length} ürün dışa aktarıldı!`);
}

function exportStandardXml(products) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n';
    products.forEach(p => {
        xml += `  <parent>\n`;
        xml += `    <item_group_id>${p.id}</item_group_id>\n`;
        xml += `    <name>${p.name}</name>\n`;
        xml += `    <brand>${p.brand}</brand>\n`;
        xml += `    <description><![CDATA[${p.description || ''}]]></description>\n`;
        xml += `    <category>${p.category || ''}</category>\n`;
        xml += `    <main>${p.mainImage || ''}</main>\n`;
        xml += `    <created_at>${p.createdAt || new Date().toISOString()}</created_at>\n`;
        (p.variants || []).forEach(v => {
            xml += `    <variant>\n`;
            xml += `      <id>${v.id}</id>\n`;
            xml += `      <sku>${v.sku || ''}</sku>\n`;
            xml += `      <price>${v.price || p.minPrice}</price>\n`;
            xml += `      <regular_price>${v.regularPrice || p.minPrice}</regular_price>\n`;
            xml += `      <stock_status>${v.stockStatus || 'instock'}</stock_status>\n`;
            xml += `      <stock_qty>${v.stockQty || 0}</stock_qty>\n`;
            xml += `      <attribute name="Beden">${v.bed || ''}</attribute>\n`;
            xml += `      <attribute name="Renk">${v.renk || ''}</attribute>\n`;
            xml += `      <image>${v.image || p.mainImage || ''}</image>\n`;
            xml += `    </variant>\n`;
        });
        xml += `  </parent>\n`;
    });
    xml += '</products>';
    return xml;
}

function exportStockMountXml(products) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Products>\n';
    products.forEach(p => {
        xml += `  <Product>\n`;
        xml += `    <Code>${p.id}</Code>\n`;
        xml += `    <Name>${p.name}</Name>\n`;
        xml += `    <Brand>${p.brand}</Brand>\n`;
        xml += `    <Category>${p.category || 'Genel'}</Category>\n`;
        xml += `    <Description><![CDATA[${p.description || ''}]]></Description>\n`;
        xml += `    <Price>${p.minPrice}</Price>\n`;
        xml += `    <VatRate>${p.taxRate || 18}</VatRate>\n`;
        xml += `    <Stock>${p.stockQty || 0}</Stock>\n`;
        xml += `    <ImageUrl>${p.mainImage || ''}</ImageUrl>\n`;
        (p.galleryImages || []).forEach((img, i) => {
            xml += `    <ImageUrl${i + 1}>${img}</ImageUrl${i + 1}>\n`;
        });
        xml += `    <Status>active</Status>\n`;
        xml += `  </Product>\n`;
    });
    xml += '</Products>';
    return xml;
}

function exportTicimaxXml(products) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Products>\n';
    products.forEach(p => {
        xml += `  <Product>\n`;
        xml += `    <ProductCode>${p.id}</ProductCode>\n`;
        xml += `    <ProductName>${p.name}</ProductName>\n`;
        xml += `    <BrandCode>${p.brand}</BrandCode>\n`;
        xml += `    <CategoryCode>${p.categorySlug || p.category || 'genel'}</CategoryCode>\n`;
        xml += `    <Description><![CDATA[${p.description || ''}]]></Description>\n`;
        xml += `    <ListPrice>${p.minPrice}</ListPrice>\n`;
        xml += `    <Price>${p.campaignPrice || p.minPrice}</Price>\n`;
        xml += `    <VatRate>${p.taxRate || 18}</VatRate>\n`;
        xml += `    <StockQuantity>${p.stockQty || 0}</StockQuantity>\n`;
        xml += `    <Image1>${p.mainImage || ''}</Image1>\n`;
        (p.galleryImages || []).slice(0, 4).forEach((img, i) => {
            xml += `    <Image${i + 2}>${img}</Image${i + 2}>\n`;
        });
        xml += `    <IsActive>true</IsActive>\n`;
        xml += `  </Product>\n`;
    });
    xml += '</Products>';
    return xml;
}

function exportIdeaSoftXml(products) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Products>\n';
    products.forEach(p => {
        xml += `  <Product>\n`;
        xml += `    <ProductID>${p.id}</ProductID>\n`;
        xml += `    <ProductName>${p.name}</ProductName>\n`;
        xml += `    <Brand>${p.brand}</Brand>\n`;
        xml += `    <CategoryName>${p.category || 'Genel'}</CategoryName>\n`;
        xml += `    <Description><![CDATA[${p.description || ''}]]></Description>\n`;
        xml += `    <NormalPrice>${p.minPrice}</NormalPrice>\n`;
        xml += `    <Price>${p.campaignPrice || p.minPrice}</Price>\n`;
        xml += `    <Tax>${p.taxRate || 18}</Tax>\n`;
        xml += `    <Stock>${p.stockQty || 0}</Stock>\n`;
        xml += `    <MainImage>${p.mainImage || ''}</MainImage>\n`;
        (p.galleryImages || []).forEach(img => {
            xml += `    <Image>${img}</Image>\n`;
        });
        xml += `    <Status>1</Status>\n`;
        xml += `  </Product>\n`;
    });
    xml += '</Products>';
    return xml;
}

async function importXmlFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    showToast('XML dosyası işleniyor...', 'info');
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(event.target.result, 'text/xml');

            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                showToast('Geçersiz XML dosyası!', 'error');
                return;
            }

            let products = [];

            if (xmlDoc.querySelector('parent')) {
                products = parseXMLProducts(xmlDoc);
            } else if (xmlDoc.querySelector('Products')) {
                products = parseGenericProducts(xmlDoc);
            } else if (xmlDoc.querySelector('products')) {
                products = parseGenericProducts(xmlDoc);
            }

            if (products.length === 0) {
                showToast('XML dosyasında ürün bulunamadı!', 'error');
                return;
            }

            const feedId = 'manual-import-' + Date.now();
            products.forEach(p => { p.feedId = feedId; });

            const existing = JSON.parse(localStorage.getItem('adminProducts') || '[]');
            localStorage.setItem('adminProducts', JSON.stringify([...existing, ...products]));

            const feeds = getFeeds();
            feeds.push({
                id: feedId,
                name: 'İçe Aktar: ' + file.name,
                url: 'local://' + file.name,
                active: true,
                lastLoaded: new Date().toISOString(),
                status: 'loaded',
                productCount: products.length
            });
            saveFeeds(feeds);

            showToast(`${products.length} ürün XML dosyasından yüklendi!`);
            loadFeeds();
            loadDashboard();
        } catch (error) {
            showToast('XML dosyası işlenirken hata: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function parseGenericProducts(xmlDoc) {
    const productEls = xmlDoc.querySelectorAll('Product, product, parent');
    const products = [];

    productEls.forEach(el => {
        const id = getTextSafe(el, 'id, ProductID, Code, ProductCode, item_group_id');
        const name = getTextSafe(el, 'name, ProductName, Name');
        const brand = getTextSafe(el, 'brand, Brand, BrandCode');
        const category = getTextSafe(el, 'category, CategoryName, Category');
        const description = getTextSafe(el, 'description, Description');
        const price = parseFloat(getTextSafe(el, 'price, Price, ListPrice, NormalPrice')) || 0;
        const stock = parseInt(getTextSafe(el, 'stock, Stock, StockQuantity')) || 0;
        const image = getTextSafe(el, 'image, ImageUrl, Image1, MainImage, main');
        const taxRate = parseFloat(getTextSafe(el, 'tax, Tax, VatRate')) || 18;

        const variants = [];
        const variantEls = el.querySelectorAll('variant, Variant');
        variantEls.forEach(v => {
            variants.push({
                id: getTextSafe(v, 'id, ID'),
                sku: getTextSafe(v, 'sku, SKU'),
                price: parseFloat(getTextSafe(v, 'price, Price')) || price,
                regularPrice: parseFloat(getTextSafe(v, 'regular_price, ListPrice')) || price,
                stockStatus: getTextSafe(v, 'stock_status, StockStatus') || (stock > 0 ? 'instock' : 'outofstock'),
                stockQty: parseInt(getTextSafe(v, 'stock_qty, StockQuantity')) || stock,
                bed: getTextSafe(v, 'bed, Beden, Size'),
                renk: getTextSafe(v, 'renk, Renk, Color'),
                image: getTextSafe(v, 'image, Image')
            });
        });

        const galleryImages = [];
        el.querySelectorAll('Image, ImageUrl, gallery image').forEach(img => {
            if (img.textContent.trim()) galleryImages.push(img.textContent.trim());
        });

        const colors = new Set();
        const sizes = new Set();
        variants.forEach(v => {
            if (v.renk) colors.add(v.renk.toLowerCase());
            if (v.bed) sizes.add(v.bed);
        });

        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
        const sortedSizes = Array.from(sizes).sort((a, b) => {
            const ia = sizeOrder.indexOf(a.toUpperCase()), ib = sizeOrder.indexOf(b.toUpperCase());
            return (ia === -1 && ib === -1) ? a.localeCompare(b) : ia === -1 ? 1 : ib === -1 ? -1 : ia - ib;
        });

        products.push({
            id: id || 'imported-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            name: name || 'İsimsiz Ürün',
            brand: brand || 'Bilinmeyen',
            category: category || '',
            categorySlug: (category || '').toLowerCase().replace(/\s+/g, '-'),
            description: description || '',
            mainImage: image || '',
            galleryImages: galleryImages,
            videoUrl: '',
            createdAt: new Date().toISOString(),
            variants: variants.length > 0 ? variants : [{
                id: 'v-' + Date.now(),
                sku: '',
                price: price,
                regularPrice: price,
                stockStatus: stock > 0 ? 'instock' : 'outofstock',
                stockQty: stock,
                bed: '',
                renk: '',
                image: image
            }],
            colors: Array.from(colors),
            sizes: sortedSizes,
            minPrice: price,
            hasStock: stock > 0,
            stockQty: stock,
            source: 'xml',
            featured: false,
            campaign: false,
            campaignPrice: null,
            taxRate: taxRate
        });
    });

    return products;
}

function getTextSafe(el, selectors) {
    for (const sel of selectors.split(', ')) {
        const found = el.querySelector(sel);
        if (found && found.textContent.trim()) return found.textContent.trim();
    }
    return '';
}

// ===================== PAYMENT SETTINGS =====================
function getPaymentSettings() {
    return JSON.parse(localStorage.getItem('paymentSettings') || JSON.stringify({
        whatsapp: true,
        email: true,
        door: true,
        bank: false
    }));
}

function savePaymentSettings() {
    const settings = {
        whatsapp: document.getElementById('payWhatsapp')?.checked || false,
        email: document.getElementById('payEmail')?.checked || false,
        door: document.getElementById('payDoor')?.checked || false,
        bank: document.getElementById('payBank')?.checked || false
    };
    localStorage.setItem('paymentSettings', JSON.stringify(settings));
    showToast('Ödeme ayarları kaydedildi!');
}

function loadPaymentSettings() {
    const settings = getPaymentSettings();
    const payWhatsapp = document.getElementById('payWhatsapp');
    const payEmail = document.getElementById('payEmail');
    const payDoor = document.getElementById('payDoor');
    const payBank = document.getElementById('payBank');
    if (payWhatsapp) payWhatsapp.checked = settings.whatsapp;
    if (payEmail) payEmail.checked = settings.email;
    if (payDoor) payDoor.checked = settings.door;
    if (payBank) payBank.checked = settings.bank;
}

initAdmin();
