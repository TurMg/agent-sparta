# Quick Start Guide - Agent AI SPH Generator

## 🚀 Menjalankan Project

### 1. Setup Project
```bash
# Clone atau download project
cd agent-ai

# Jalankan setup script
./setup.sh
```

### 2. Konfigurasi Environment
Edit file `backend/.env`:
```env
# Wajib diisi
LLM_API_URL=http://your-llm-api-endpoint
LLM_API_KEY=your-api-key

# Opsional - info perusahaan
COMPANY_NAME=PT. Nama Perusahaan Anda
COMPANY_ADDRESS=Alamat Perusahaan
COMPANY_PHONE=+62-21-xxxxxxxx
COMPANY_EMAIL=info@perusahaan.com
```

### 3. Jalankan Development Server
```bash
npm run dev
```

Akses aplikasi di:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 4. Login Pertama Kali
- **Username**: admin
- **Password**: admin123

## 📱 Cara Menggunakan

### 1. Login ke Sistem
- Buka http://localhost:3000
- Login dengan akun admin atau daftar akun baru

### 2. Membuat SPH dengan AI
- Klik "Chat AI" atau "Mulai Chat Baru"
- Ketik pesan seperti:
  ```
  Buatkan SPH untuk pelanggan PT ABC, tanggal 2024-01-15, 
  layanan Internet Dedicated 10 Mbps sebanyak 5 sambungan 
  dengan biaya PSB Rp 500.000, biaya bulanan normal Rp 1.000.000, 
  biaya bulanan diskon Rp 800.000
  ```

### 3. Review dan Download Dokumen
- AI akan generate SPH secara otomatis
- Klik link untuk melihat dokumen HTML
- Download PDF untuk print atau kirim ke customer
- Akses melalui menu "Dokumen" untuk melihat semua SPH

## 🎯 Fitur Utama MVP

### ✅ Authentication
- Login/Register system
- JWT-based security
- Protected routes

### ✅ AI Chat Interface
- ChatGPT-like interface
- Session management
- Context-aware conversations

### ✅ SPH Generation
- Template-based generation
- Professional Indonesian format
- Automatic PDF conversion
- Company branding

### ✅ Document Management
- List all generated documents
- View document details
- Status tracking (Draft → Generated → Signed → Sent)
- Download HTML/PDF files

### ✅ MCP Tools Integration
- Modular AI tools architecture
- SPH generation tool
- Data validation tool
- Currency formatting tool

## 🔧 Troubleshooting

### Port sudah digunakan
```bash
# Kill process di port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill process di port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Database error
```bash
# Reset database
rm -rf backend/data/
# Restart server - database akan dibuat ulang
```

### Build error
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm run install:all
```

## 📝 Contoh Penggunaan AI

### Format Pesan untuk Generate SPH
```
Buatkan SPH untuk [Nama Customer], tanggal [YYYY-MM-DD], 
dengan layanan:
1. [Nama Layanan] - [Jumlah] sambungan - PSB: [Rp xxx] - Normal: [Rp xxx] - Diskon: [Rp xxx]
2. [Layanan lain jika ada...]

Catatan: [Catatan tambahan jika perlu]
```

### Contoh Konkret
```
Buatkan SPH untuk PT Maju Jaya, tanggal 2024-01-20, dengan layanan:
1. Internet Dedicated 20 Mbps - 3 sambungan - PSB: Rp 750.000 - Normal: Rp 1.500.000 - Diskon: Rp 1.200.000
2. WiFi Hotspot - 10 sambungan - PSB: Rp 200.000 - Normal: Rp 300.000 - Diskon: Rp 250.000

Catatan: Harga sudah termasuk PPN dan berlaku selama 12 bulan
```

## 🚀 Next Steps (Phase 2)

Setelah MVP berjalan, fitur yang akan ditambahkan:

### WhatsApp Integration
- Bot WhatsApp untuk generate SPH
- Notifikasi status dokumen
- Customer interaction via WA

### Customer Profile Tools
- Database customer
- History SPH per customer
- Customer analytics

### Advanced Features
- Multiple templates
- E-signature integration
- Email automation
- Dashboard analytics

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check DEVELOPMENT.md untuk detail teknis
2. Check logs di terminal untuk error messages
3. Pastikan semua dependencies ter-install dengan benar
4. Pastikan LLM API endpoint sudah dikonfigurasi

## 🎉 Selamat!

Project Agent AI SPH Generator MVP sudah siap digunakan! 
Sistem ini dapat:
- Generate SPH professional secara otomatis
- Manage dokumen dengan rapi
- Interface yang user-friendly
- Arsitektur modular untuk pengembangan future features
