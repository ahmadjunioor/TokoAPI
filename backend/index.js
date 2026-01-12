const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const path = require('path'); 
const db = require('./db');   
const swaggerDocument = require('./api.json'); 
const crypto = require('crypto'); // Modul untuk acak API Key

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. KONFIGURASI TAMPILAN & ROUTING
// ==========================================

// A. Folder Public (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// B. Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// C. Fix Error "Cannot GET /api.json"
app.get('/api.json', (req, res) => {
    res.json(swaggerDocument);
});

// D. Halaman Utama (Welcome Page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/welcome.html'));
});

// ==========================================
// 2. MIDDLEWARE SECURITY
// ==========================================

const checkApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ message: "API Key diperlukan di header 'x-api-key'" });

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (rows.length === 0) return res.status(401).json({ message: "API Key salah atau tidak valid" });
        req.user = rows[0]; // Simpan data user (termasuk username) ke request
        next();
    } catch (error) {
        res.status(500).json({ message: "Gagal memvalidasi API Key" });
    }
};

// ==========================================
// 3. ENDPOINT API (USER & AUTH)
// ==========================================

// Cek Status Server
app.get('/api/status', (req, res) => {
    res.json({ message: "Server Advanced Inventory System Ready!" });
});

// REGISTER (Buat API Key Baru)
app.post('/api/register', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username harus diisi!" });

    try {
        const newApiKey = crypto.randomBytes(8).toString('hex');
        await db.query('INSERT INTO users (username, api_key) VALUES (?, ?)', [username, newApiKey]);

        res.status(201).json({
            status: "success",
            message: "Akun berhasil dibuat!",
            data: { username: username, api_key: newApiKey }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal register (Username mungkin sudah ada)" });
    }
});

// CEK PROFIL (Who am I?)
app.get('/api/me', checkApiKey, (req, res) => {
    // Cek apakah username-nya 'admin' (huruf kecil/besar tidak masalah)
    const isAdmin = req.user.username.toLowerCase() === 'admin';

    res.json({
        status: "success",
        data: {
            username: req.user.username,
            // Jika admin, tulis "Admin". Jika bukan, tulis "Player"
            role: isAdmin ? "Admin" : "Player" 
        }
    });
});

// ==========================================
// 4. ENDPOINT API (TOKO & TRANSAKSI)
// ==========================================

// GET PRODUCTS
app.get('/api/products', checkApiKey, async (req, res) => {
    const { search, category_id } = req.query;
    let sql = `SELECT p.id, p.nama, p.harga, p.stok, c.nama_kategori FROM products p LEFT JOIN categories c ON p.category_id = c.id`;
    let params = [];
    let conditions = [];

    if (search) { conditions.push('p.nama LIKE ?'); params.push(`%${search}%`); }
    if (category_id) { conditions.push('p.category_id = ?'); params.push(category_id); }
    if (conditions.length > 0) { sql += ' WHERE ' + conditions.join(' AND '); }

    try {
        const [rows] = await db.query(sql, params);
        res.json({ status: "success", total_data: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ message: "Error ambil data", error });
    }
});

// POST PRODUCT (Tambah Barang)
app.post('/api/products', checkApiKey, async (req, res) => {
    const { nama, harga, stok = 100, category_id = 1 } = req.body;
    try {
        const [result] = await db.query('INSERT INTO products (nama, harga, stok, category_id) VALUES (?, ?, ?, ?)', [nama, harga, stok, category_id]);
        res.status(201).json({ status: "success", data: { id: result.insertId } });
    } catch (error) { res.status(500).json({ message: "Gagal tambah produk" }); }
});

// TRANSACTION (Beli Barang)
app.post('/api/transaction', checkApiKey, async (req, res) => {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: "Data tidak lengkap" });

    try {
        // 1. Cek Produk & Stok
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (products.length === 0) return res.status(404).json({ message: "Produk tidak ditemukan" });
        const product = products[0];

        if (product.stok < quantity) return res.status(400).json({ message: "Stok habis/kurang!" });

        // 2. Proses Transaksi
        const totalBayar = product.harga * quantity;
        await db.query('UPDATE products SET stok = stok - ? WHERE id = ?', [quantity, productId]);
        const [result] = await db.query('INSERT INTO transactions (user_id, product_id, quantity, total_harga) VALUES (?, ?, ?, ?)', [req.user.id, productId, quantity, totalBayar]);

        res.json({
            status: "success",
            message: "Transaksi berhasil",
            receipt: {
                item: product.nama,
                qty: quantity,
                total: totalBayar,
                sisa_stok: product.stok - quantity
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal transaksi" });
    }
});

app.delete('/api/products/:id', checkApiKey, async (req, res) => {
    const { id } = req.params; // Ambil ID dari URL (contoh: /api/products/5)

    try {
        // Hapus dari database
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Produk tidak ditemukan" });
        }

        res.json({
            status: "success",
            message: "Produk berhasil dihapus selamanya"
        });
    } catch (error) {
        // Biasanya error kalau produk ini sudah pernah dibeli (ada di riwayat transaksi)
        // Database melarang hapus produk yang punya sejarah transaksi
        res.status(500).json({ 
            message: "Gagal hapus. Mungkin produk ini ada di riwayat transaksi user?" 
        });
    }
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(port, () => {
    console.log(` WEB : http://localhost:${port}/index.html`);
});