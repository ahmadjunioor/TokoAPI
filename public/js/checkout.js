const key = checkAuth();
const item = JSON.parse(localStorage.getItem('cart_item')); // Ambil data belanjaan tadi

if(!item) window.location.href = 'dashboard.html'; // Kalau gak ada barang, balik

// Tampilkan Data
document.getElementById('itemName').innerText = item.nama;
document.getElementById('itemPrice').innerText = item.harga.toLocaleString();
let qty = 1;

function updateTotal() {
    document.getElementById('qtyInput').value = qty;
    document.getElementById('totalPrice').innerText = "Rp " + (item.harga * qty).toLocaleString();
}

function changeQty(n) {
    if(qty + n > 0) { qty += n; updateTotal(); }
}

// ... (Kode atas tetap sama) ...

async function processBuy() {
    try {
        const res = await fetch(`${API_URL}/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key },
            body: JSON.stringify({ productId: item.id, quantity: qty })
        });
        const result = await res.json();
        
        if(res.status === 200) {
            // Tampilan Sukses ala Mario
            Swal.fire({
                title: '',
                text: `Transaksi Berhasil!`,
                icon: 'success',
                confirmButtonText: 'Lanjutkan Belanja!',
            }).then(() => {
                window.location.href = 'dashboard.html';
            });
        } else {
            Swal.fire('OH NO...', result.message, 'error');
        }
    } catch(e) { 
        Swal.fire('ERROR', 'Gagal menghubungi server', 'error');
    }
}

updateTotal();