# Panduan Deployment MiniChat (Versi Lite / Tanpa Database)

Ini adalah versi **Lite** yang tidak menggunakan database. Pesan hanya disimpan sementara di memori server.
Deployment menjadi jauh lebih mudah karena Anda **TIDAK PERLU** mengatur Environment Variables yang rumit.

## Pilihan Hosting

### 1. Glitch.com (Paling Instant ⚡)
1. Buka [Glitch.com](https://glitch.com).
2. Klik **New Project** -> **Import from GitHub**.
3. Masukkan URL Repo Anda: `https://github.com/minichatJRK/MiniChatJRK`
4. Selesai! Aplikasi langsung jalan tanpa konfigurasi apapun.

### 2. Render / Railway / Adaptable
Caranya sama seperti sebelumnya, tapi sekarang Anda bisa **SKIP** (lewati) bagian mengisi `MONGO_URI`.
Cukup deploy saja, dan aplikasi akan langsung aktif.

---
**Catatan:**
Karena tidak pakai database, jika server restart (misal tidur di Render/Glitch), riwayat chat akan hilang.
Tapi untuk penggunaan realtime harian atau tes, ini sudah sangat lancar.
