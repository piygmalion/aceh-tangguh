# BM-kab-topo — perbaikan topologi batas kabupaten

Agent: data
Gelombang: BM-kab-topo
Status: draf

Sumber tetap GADM 4.1 `gadm41_IDN_2` (katalog `gadm-kab`). Poligon tidak dibuat ulang dari dissolve desa.

## Aturan

- `make_valid` pada tiap fitur. Hausdorff batas tiap kabupaten terhadap cincin mentah paling besar 1.78e-15 derajat, jadi garis pantai tidak bergeser pada langkah ini.
- Tumpang tindih: `kode_kab` yang lebih kecil menyimpan irisan. `kode_kab` yang lebih besar diganti `difference`. Urutan menaik, jadi kode terkecil juga menang pada irisan tiga pihak.
- Celah dalam: setiap lubang interior dari union diberikan utuh ke tetangga dengan batas bersama terpanjang. Seri dipecah oleh `kode_kab` yang lebih kecil, lalu jarak yang lebih dekat. Lekukan pantai yang bukan lubang interior tidak diisi.
- Bersihkan batas bersama: simpul dalam 1e-8 derajat dilas ke koordinat asli yang paling kecil secara leksikografis (tidak ada simpul baru). Simpul yang berada dalam 1e-12 derajat dari tali busur tetangganya dibuang. Lalu `set_precision` GEOS 1e-7 derajat, mode `valid_output`.

## Angka

Diukur pada `a1f3b20`, luas geodesic WGS84.

| | sebelum | sesudah |
| --- | ---: | ---: |
| Fitur tidak valid | 7 (Aceh Barat Daya, Aceh Besar, Aceh Selatan, Aceh Singkil, Aceh Timur, Sabang, Simeulue) | 0 |
| Pasangan tumpang tindih | 38, jumlah 296.69 km2 | 22 pasangan sisa di bawah 0.0001 km2 tiap pasang; jumlah 0.0001 km2 |
| Lubang interior union | 213, jumlah 344.73 km2, maksimum 76.99 km2 | 14, jumlah 0.0011 km2, maksimum 0.000545 km2 |
| Aceh Tamiang ∩ Aceh Timur | 18.352 km2 di 97.84988E 4.33647N | di bawah 0.0001 km2 |
| Aceh Timur ∩ Langsa | 3.292 km2 di 97.91247E 4.46979N | 0 |
| Celah di antara ketiga kabupaten itu | 14 lubang, 3.3388 km2, maksimum 0.733 km2 | tidak ada lubang interior union; satu poligon 0.056 km2 di antara ketiganya terisi penuh oleh Aceh Utara |

Ambang uji CI adalah 0.01 km2. Semua pasangan dan semua lubang interior union berada di bawah ambang itu.

## Garis pantai

Acuan adalah garis luar cangkang terluar dari union setelah `make_valid`, sebelum irisan dibagi atau lubang diisi. Hausdorff garis itu terhadap hasil akhir adalah **1.36e-7 derajat**, di bawah 1e-6 derajat.

Berkas: 54,543 bita menjadi 59,443 bita (rasio 1.090). Koordinat tertulis paling banyak 7 angka desimal. Jumlah simpul 3,039 menjadi 3,184. 49 simpul dilas.

`/api/boundaries` mengembalikan FeatureCollection yang valid dengan 23 fitur. Properti `name`, `level`, dan `kode_kab` tidak berubah. Geometri yang sama, dicocokkan menurut `name`, disalin ke `r3pDistribution.geojson` dan `irbi2025.geojson` tanpa mengubah angka atribut.

## Titik dan penanda

Logika titik-dalam-poligon sama dengan `scripts/snap-offshore-disaster-markers.py` (`point_in_ring` / `point_in_geom`). Skrip penanda tidak dijalankan ulang ke fixture.

`contained` menghitung sebuah titik di setiap kabupaten yang memuatnya, jadi tumpang tindih terhitung dua kali. `resolved` memakai `kode_kab` terkecil bila sebuah titik masuk lebih dari satu kabupaten.

Kejadian (427) dan penanda `disasterEvents` (427): tidak ada titik yang pindah kabupaten. Satu titik tetap di luar semua kabupaten.

Penanda seluruh lapisan (4,599): 15 titik berubah himpunan kabupaten. Sembilan di antaranya pindah dari luar ke dalam sebuah kabupaten karena lubang interior terisi. Enam lainnya kehilangan kabupaten kedua pada bekas tumpang tindih; kabupaten terpilih (`resolved`) tidak berubah.

| id | layer | title | lon | lat | sebelum | sesudah | resolved sebelum | resolved sesudah |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| fe-10106226 | facEducation | SMP NEGERI 2 TANAH JAMBO AYE | 97.46814 | 5.10171 | Aceh Timur + Aceh Utara | Aceh Timur | Aceh Timur | Aceh Timur |
| fe-10101751 | facEducation | SDN SEUNEUBOK TUHA | 97.50862 | 5.03462 | luar | Aceh Utara | luar | Aceh Utara |
| fe-69812498 | facEducation | TK PERMATA AL QUR AN | 97.46084 | 5.11243 | Aceh Timur + Aceh Utara | Aceh Timur | Aceh Timur | Aceh Timur |
| fe-69952679 | facEducation | PAUD BABUL MUTAALIMIN | 97.50023 | 5.07248 | luar | Aceh Utara | luar | Aceh Utara |
| fe-10104336 | facEducation | SD MUHAMMADIYAH LEMBAH JAYA | 97.98780 | 4.38909 | Aceh Timur + Aceh Tamiang | Aceh Timur | Aceh Timur | Aceh Timur |
| fe-K9996936 | facEducation | LKP HASRATI SOUVENIR | 96.02801 | 5.14009 | Pidie + Pidie Jaya | Pidie | Pidie | Pidie |
| fe-70012713 | facEducation | TK Albayan | 96.15388 | 5.07659 | Pidie + Pidie Jaya | Pidie | Pidie | Pidie |
| fe-70001326 | facEducation | KB MEUTUAH INDAH | 98.02397 | 4.41687 | luar | Aceh Tamiang | luar | Aceh Tamiang |
| fe-10107756 | facEducation | SD NEGERI LONGKIB | 97.82278 | 2.55257 | luar | Subulussalam | luar | Subulussalam |
| fe-10104161 | facEducation | SD NEGERI PANJI | 97.81527 | 2.57342 | luar | Subulussalam | luar | Subulussalam |
| fe-70007009 | facEducation | SD NEGERI TANAH TUMBUH | 97.80940 | 2.80670 | luar | Subulussalam | luar | Subulussalam |
| fe-69822412 | facEducation | SDN Suak Jampak Lama | 97.80540 | 2.79560 | luar | Subulussalam | luar | Subulussalam |
| KPLS-000239 | policeOffices | POLSEK BEBESEN | 97.00000 | 4.63028 | luar | Bener Meriah | luar | Bener Meriah |
| FPMG-000010 | facGov | Kantor Camat Bebesen | 97.00000 | 4.62931 | luar | Bener Meriah | luar | Bener Meriah |
| FIBD-000249 | facReligious | Masjid Baitul Izzah | 96.04651 | 5.23849 | Pidie + Pidie Jaya | Pidie | Pidie | Pidie |

Tabel hitung per kabupaten ada di `pip.md`.

## Teaser

`node scripts/build-peta-teaser-paths.mjs` menulis ulang 23 string path di `src/components/beranda/peta-teaser-paths.ts` (23 sisipan, 23 hapusan). `name` dan `kode_kab` pada path tidak berubah.

## Tangkapan layar

Sentroid luas seluruh irisan Aceh Tamiang ∩ Aceh Timur (97.85E 4.34N) jatuh di luar poligon irisan. Ketukan memakai titik di dalam bagian terbesar, 97.95358E 4.38354N. Sebelum perbaikan titik itu masuk Aceh Timur dan Aceh Tamiang sekaligus; panel menampilkan Aceh Tamiang karena itu fitur teratas. Sesudah perbaikan hanya Aceh Timur yang memuatnya, dan panel menampilkan Aceh Timur.

Cuplikan ada di berkas `before-*.png` dan `after-*.png` pada folder ini: beranda dan `/peta` pada 390×844 serta 1440×900, termasuk ketukan di bekas irisan.
