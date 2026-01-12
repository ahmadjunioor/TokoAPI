const API_URL = 'http://localhost:3000/api';

async function handleLogin() {
    const key = document.getElementById('apiKeyInput').value;
    
    // Ganti alert biasa dengan Swal.fire
    if(!key) return Swal.fire('HEY!', 'Masukkan API Key dulu!', 'warning');

    try {
        const res = await fetch(`${API_URL}/products`, { headers: { 'x-api-key': key } });
        if(res.status === 401) {
            Swal.fire('GAME OVER', 'API Key Salah!', 'error');
        } else {
            localStorage.setItem('toko_api_key', key);
            // Pakai timer biar sempat baca suksesnya sebelum pindah
            Swal.fire({
                title: '',
                text: 'Login Berhasil',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'dashboard.html';
            });
        }
    } catch(e) {
        Swal.fire('ERROR', 'Server Down!', 'error');
    }
}

// ... (Sisa fungsi checkAuth & logout biarkan sama) ...

// Fungsi Cek Login (Dipakai di Dashboard & Checkout)
function checkAuth() {
    const key = localStorage.getItem('toko_api_key');
    if(!key) window.location.href = 'index.html'; // Tendang balik ke login
    return key;
}

// Fungsi Logout
function logout() {
    localStorage.removeItem('toko_api_key');
    window.location.href = 'index.html';
}

async function registerUser() {
    // 1. Minta Input Username pakai Popup Mario
    const { value: username } = await Swal.fire({
        title: 'NEW CHALLENGER!',
        input: 'text',
        inputLabel: 'Enter Your Username',
        inputPlaceholder: 'Ex: Mario123',
        showCancelButton: true,
        confirmButtonText: 'GENERATE KEY',
        customClass: {
            popup: 'swal2-popup' // Biar tetap kotak-kotak
        }
    });

    if (username) {
        try {
            // 2. Panggil API Backend
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });

            const result = await response.json();

            if (response.status === 201) {
                // 3. Tampilkan Kunci Baru
                await Swal.fire({
                    title: 'KEY OBTAINED! 🔑',
                    html: `
                        <p>Copy kunci ini untuk login:</p>
                        <h2 style="color: #FFD300; background: #333; padding: 10px; font-family: monospace;">
                            ${result.data.api_key}
                        </h2>
                    `,
                    icon: 'success',
                    confirmButtonText: 'COPY & LOGIN'
                });

                // Otomatis isikan ke kolom login
                document.getElementById('apiKeyInput').value = result.data.api_key;
            } else {
                Swal.fire('ERROR', result.message, 'error');
            }
        } catch (error) {
            Swal.fire('ERROR', 'Server Error', 'error');
        }
    }
}