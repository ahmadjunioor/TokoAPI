const key = checkAuth(); 

// Variabel Global untuk menyimpan status "Apakah dia Admin?"
let isAdmin = false; 

// 1. AMBIL PROFIL USER & TENTUKAN HAK AKSES
async function getUserProfile() {
    try {
        const titleEl = document.getElementById('userTitle');
        const addBtn = document.getElementById('btnAddItem'); // Tombol Tambah di Navbar

        const response = await fetch(`${API_URL}/me`, { headers: { 'x-api-key': key } });
        const result = await response.json();
        
        if (response.ok) {
            const username = result.data.username;
            titleEl.innerText = `${username.toUpperCase()} `;

            // --- LOGIKA PENENTUAN ADMIN ---
            
            if (username.toLowerCase() === 'admin') {
                isAdmin = true;
                // Munculkan tombol Add Item
                if(addBtn) addBtn.style.display = 'block'; 
            } else {
                isAdmin = false;
                // Pastikan tombol Add Item sembunyi
                if(addBtn) addBtn.style.display = 'none';
            }
        }
    } catch (e) {
        document.getElementById('userTitle').innerText = "PLAYER DASHBOARD";
    }
}

// 2. LOAD PRODUK (Dengan Logika Sembunyi Tombol Delete)
async function loadProducts(query = '') {
    const list = document.getElementById('productList');
    // ... spinner loading ...

    try {
        let url = `${API_URL}/products`;
        if(query) url += `?search=${query}`;

        const response = await fetch(url, { headers: { 'x-api-key': key } });
        const result = await response.json();
        
        let html = '';
        if(result.data && result.data.length > 0) {
            result.data.forEach(p => {
                const isHabis = p.stok <= 0;
                const btnState = isHabis ? 'disabled' : `onclick="goToCheckout(${p.id}, '${p.nama}', ${p.harga})"`;
                const btnText = isHabis ? 'HABIS' : 'BELI';
                const btnColor = isHabis ? 'btn-secondary' : 'btn-primary';

                // --- LOGIKA TOMBOL DELETE ---
                // Tombol X hanya dibuat jika isAdmin = true
                let deleteButtonHtml = '';
                if (isAdmin) {
                    deleteButtonHtml = `
                        <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-0 border-2 border-dark fw-bold" 
                                onclick="deleteProduct(${p.id}, '${p.nama}')" 
                                style="box-shadow: 2px 2px 0 #000; z-index: 10;">
                            X
                        </button>
                    `;
                }

                html += `
                <div class="col-md-6 col-lg-3 mb-4">
                    <div class="product-card h-100 p-3 d-flex flex-column position-relative">
                        
                        ${deleteButtonHtml}

                        <div class="mb-3">
                            <h5 class="fw-bold mb-2 text-uppercase pe-4" style="line-height: 1.4; min-height: 3rem;">
                                ${p.nama}
                            </h5>
                            <p class="small mb-0" style="font-family: monospace;">
                                Stok: <span class="${isHabis ? 'text-danger' : 'text-muted'}">${p.stok}</span>
                            </p>
                        </div>

                        <div class="mt-auto pt-3 border-top border-2 border-dark d-flex justify-content-between align-items-center">
                            <span class="price-tag" style="font-size: 0.8rem;">
                                Rp ${p.harga.toLocaleString('id-ID')}
                            </span>
                            <button class="btn ${btnColor} btn-sm fw-bold px-3 py-2" ${btnState} style="font-size: 0.7rem;">
                                ${btnText}
                            </button>
                        </div>
                    </div>
                </div>`;
            });
        } else {
            html = '<div class="col-12 text-center text-muted">Produk tidak ditemukan.</div>';
        }
        list.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

// ... (Fungsi deleteProduct, checkout, addProduct SAMA PERSIS tidak perlu diubah) ...
// (Agar kode tetap jalan, pastikan fungsi-fungsi di bawah ini tetap ada di filemu)

async function deleteProduct(id, nama) {
    const confirm = await Swal.fire({
        title: 'DELETE ITEM?',
        text: `Hapus "${nama}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'YES',
        confirmButtonColor: '#E70012'
    });

    if (confirm.isConfirmed) {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'x-api-key': key } });
        loadProducts(); 
    }
}

function goToCheckout(id, nama, harga) {
    localStorage.setItem('cart_item', JSON.stringify({ id, nama, harga }));
    window.location.href = 'checkout.html';
}

function searchProduct() {
    loadProducts(document.getElementById('searchInput').value);
}

async function addProduct() {
    // ... (kode add product lama) ...
    const nama = document.getElementById('newName').value;
    const harga = document.getElementById('newPrice').value;
    const stok = document.getElementById('newStock').value;
    const category_id = document.getElementById('newCategory').value;

    await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({ nama, harga, stok, category_id })
    });
    
    bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
    loadProducts();
}

// JALANKAN URUTAN: Cek Profil Dulu (Tentukan Admin/Bukan) -> Baru Load Produk
getUserProfile().then(() => {
    loadProducts();
});