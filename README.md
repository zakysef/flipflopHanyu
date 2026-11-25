# Belajar Hanyu

Situs kartu kosakata statis (HTML + CSS + JavaScript biasa). Tanpa build, tanpa database.

## Jalankan lokal
`python3 -m http.server` lalu buka http://localhost:8000 (jangan buka index.html langsung, karena fetch JSON ditolak di file://).

## Hosting GitHub Pages
1. Buat repo baru, unggah seluruh isi folder ini (index.html di root).
2. Settings > Pages > Source: "Deploy from a branch" > branch `main`, folder `/ (root)`.
3. Situs aktif di https://USERNAME.github.io/NAMA-REPO/

## Menambah data
Edit `data/bab-XX.json`. Tiap entri: `{"h":"你","p":"nǐ","a":"kamu","ch":"你好！","cp":"Nǐ hǎo!","ca":"Halo!","g":"catatan tata bahasa (opsional)"}`
Jumlah kata per bab dicatat di `data/index.json`.

## Mode
- **Kosakata**: kartu 571 kata (bab 1-24), filter bab, cari, guratan.
- **Radikal**: 50 kartu radikal (`data/radikal.json`, data guratan radikal di `data/radikal-guratan.json`).
- **Aksara per radikal**: `data/kelompok.json` (dibuat dari Make Me a Hanzi). Ketuk aksara untuk membuka kata yang memuatnya.

## Font
Aksara Han memakai KaiTi (楷体) lewat font perangkat. Android umumnya tidak punya KaiTi, sehingga jatuh ke font serif.
