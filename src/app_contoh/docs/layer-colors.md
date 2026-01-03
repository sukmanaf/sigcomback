# Skema Warna Layer Peta

Dokumen ini menjelaskan skema warna yang digunakan untuk setiap layer pada peta GIS.

## Skema Warna Layer

### 1. Layer Desas (Kelurahan)
- **Fill Color**: `#ff6b6b` (Merah coral soft)
- **Fill Opacity**: `0.2`
- **Outline Color**: `#e03131` (Merah tua)
- **Outline Width**: `2px`
- **Text Color**: `#e03131` (Merah tua)
- **Text Halo**: `#ffffff` dengan width `1.5px`

### 2. Layer NOPS (Nomor Objek Pajak Spasial)
- **Fill Color**: `#4dabf7` (Biru cerah)
- **Fill Opacity**: `0.3`
- **Outline Color**: `#1971c2` (Biru tua)
- **Outline Width**: `2px`
- **Text Color**: `#1971c2` (Biru tua)
- **Text Halo**: `#ffffff` dengan width `1.5px`

### 3. Layer Bangunans (Bangunan)
- **Fill Color**: `#51cf66` (Hijau cerah)
- **Fill Opacity**: `0.3`
- **Outline Color**: `#2b8a3e` (Hijau tua)
- **Outline Width**: `2px`
- **Text Color**: `#2b8a3e` (Hijau tua)
- **Text Halo**: `#ffffff` dengan width `1.5px`

## Prinsip Desain

1. **Kontras Tinggi**: Setiap layer menggunakan warna yang berbeda untuk memudahkan identifikasi
2. **Visibilitas**: Outline yang lebih tebal (2px) dan halo text yang lebih besar (1.5px) untuk keterbacaan yang lebih baik
3. **Konsistensi**: Semua layer menggunakan pola yang sama: warna cerah untuk fill, warna tua untuk outline dan text
4. **Opacity**: Fill opacity yang cukup rendah (0.2-0.3) agar tidak menutupi basemap satellite

## Perubahan dari Versi Sebelumnya

- **Sebelumnya**: Semua layer menggunakan warna merah (#ff0000) yang sama
- **Sekarang**: Setiap layer memiliki warna yang unik dan kontras
- **Peningkatan**: Outline width diperbesar dari 1px ke 2px
- **Peningkatan**: Text halo width diperbesar untuk keterbacaan yang lebih baik
