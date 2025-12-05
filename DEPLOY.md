# Panduan Deployment MiniChat

Karena aplikasi ini menggunakan **Custom Server (Socket.io)**, Anda **TIDAK BISA** menggunakan hosting serverless biasa seperti Vercel (karena Vercel akan memutus koneksi WebSocket).

Anda membutuhkan hosting yang mendukung **Long-Running Node.js Process**.

## Rekomendasi Hosting

### 1. Railway (Paling Direkomendasikan 🏆)
Railway sangat mudah digunakan dan mendeteksi konfigurasi secara otomatis.
- **Biaya**: Ada trial, lalu berbayar (murah).
- **Kelebihan**: Setup otomatis, performa stabil.

**Cara Deploy di Railway:**
1. Push kode Anda ke **GitHub**.
2. Buka [Railway.app](https://railway.app/) dan login.
3. Klik "New Project" -> "Deploy from GitHub repo".
4. Pilih repositori `chat-app` Anda.
5. Railway akan mendeteksi ini sebagai aplikasi Node.js.
6. Masuk ke tab **Variables**, tambahkan:
   - `MONGO_URI`: (Masukkan URL MongoDB Atlas Anda)
   - `PORT`: `3000` (atau biarkan Railway mengaturnya)
7. Klik Deploy. Selesai!

### 2. Render (Alternatif Gratis)
Render memiliki paket gratis yang cukup untuk hobi.
- **Biaya**: Gratis (dengan limitasi spin-down).
- **Kelebihan**: Gratis selamanya untuk web service kecil.

**Cara Deploy di Render:**
1. Push kode ke GitHub.
2. Buka [Render.com](https://render.com/).
3. Buat "New Web Service".
4. Hubungkan repo GitHub Anda.
5. Isi konfigurasi:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (Pastikan script start di package.json adalah `next start` atau `node server.js`. **PENTING**: Ubah script start di package.json jadi `node server.js` untuk production).
6. Di bagian "Environment Variables", tambahkan `MONGO_URI`.

## Persiapan Sebelum Deploy (PENTING!)

Pastikan `package.json` Anda siap untuk production.
Saat ini script `start` Anda adalah `next start`. Ini **SALAH** untuk Socket.io custom server.
Anda harus mengubahnya menjadi `node server.js`.

Saya akan memperbaikinya untuk Anda sekarang.
