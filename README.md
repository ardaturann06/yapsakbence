# Yapilacaklar Listesi (Web + Mobil + Hesap + Fotograf)

Bu proje, hesaba bagli senkron calisan bir yapilacaklar listesi uygulamasidir.
Ayrica misafir modu ile hesapsiz da kullanilabilir.

## Ozellikler

- Kullanici kayit / giris
- Kullaniciya ozel gorev listesi (web + mobil senkron)
- Kullanici profil fotografi yukleme/silme
- Misafir modu (veri sadece o cihazda saklanir)
- Gorevler ayri menude (Genel / Gorevler sekmesi)
- Goreve fotograf ekleme (JPG/PNG/WEBP/GIF, max 5MB)
- Goreve dosya eki ekleme (PDF, DOCX, XLSX, PPTX, TXT, CSV, JSON, ZIP veya gorsel, max 15MB)
- Goreve not ekleme (max 2000 karakter)
- Goreve saat ekleme (HH:MM)
- Mobilde fotograf seciminde kamera acilabilir (destekleyen cihazlarda)
- Gorev ekleme, tamamlama, silme
- Gorevlere etiket ekleme ve etikete gore filtreleme
- Gorev arama + oncelik/tarih/etiket kombine filtreler
- Coklu secim ile toplu tamamlama ve toplu silme
- Son tarihi gelen gorevler icin tarayici bildirimi (izin verilirse)
- Tum / aktif / tamamlanan filtreleri
- Tamamlananlari tek tikla temizleme
- Responsive arayuz (mobil + masaustu)
- PWA destegi (ana ekrana ekleyebilme)
- SQLite ile kalici veri saklama
- Yonetim paneli (admin)
- Admin panelinden kullanici gorevlerini temizleme ve kullanici silme
- Paylasilan liste kodu ile birden fazla kullanicinin ayni listeyi kullanmasi
- Yonetim panelinde admin islem gecmisi (kim, ne zaman, ne sildi)

## Kurulum

```bash
npm install
```

## Calistirma

```bash
JWT_SECRET="guclu-bir-gizli-anahtar" npm start
```

Uygulama: `http://localhost:3000`

Not: `JWT_SECRET` vermeden de calisir ama guvenlik icin mutlaka ayarlaman onerilir.

Yonetim paneli icin opsiyonel degiskenler:

```bash
JWT_SECRET="guclu-bir-gizli-anahtar" ADMIN_EMAILS="admin@mail.com,ikinci@admin.com" FIRST_USER_IS_ADMIN=1 npm start
```

- `ADMIN_EMAILS`: Virgul ile ayrilmis admin e-posta listesi.
- `FIRST_USER_IS_ADMIN`: `1` ise ilk kayit olan kullanici admin olur, `0` ise olmaz.

Eger ekranda `Failed to fetch` gorursen:

- Sunucunun acik oldugunu kontrol et (`npm start`).
- Sayfayi `file://` ile degil, mutlaka `http://localhost:3000` veya `http://BILGISAYAR_IP:3000` ile ac.
- Tarayicida bir kez hard refresh yap (`Ctrl+F5`) veya PWA'yi kaldirip tekrar yukle.

## Mobilde Kullanma (Ayni Ag)

1. Sunucuyu calistir: `npm start`
2. Telefon ve bilgisayarin ayni Wi-Fi aginda olsun.
3. Bilgisayar IP adresini bul (`ifconfig` veya `ipconfig`).
4. Telefonda `http://BILGISAYAR_IP:3000` ac.
5. Ayni hesapla giris yap veya misafir moduna gec.
6. Tarayicidan "Ana ekrana ekle" secenegiyle uygulama gibi kullan.

## API Ozeti

### Kimlik Dogrulama

- `POST /api/auth/register` body JSON: `{ "name": "...", "email": "...", "password": "..." }`
- `POST /api/auth/login` body JSON: `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` header: `Authorization: Bearer <token>`
- `PATCH /api/auth/profile-photo` body `multipart/form-data`: `photo`
- `DELETE /api/auth/profile-photo`

### Todo

Asagidaki tum uçlar `Authorization: Bearer <token>` ister:

- `GET /api/todos`
- `POST /api/todos`
  - JSON body: `{ "text": "..." }`
  - JSON opsiyonel alanlar: `note`, `due_date`, `due_time`, `priority`, `tags`, `recurrence`
  - veya `multipart/form-data`: `text` + `photo` ve/veya `attachment`
- `PATCH /api/todos/:id`
  - JSON body: `{ "completed": true }` veya `{ "text": "..." }`
  - JSON opsiyonel alanlar: `note`, `due_date`, `due_time`, `priority`, `tags`, `recurrence`, `remove_attachment`
  - veya `multipart/form-data`: `photo` ve/veya `attachment` + opsiyonel `remove_photo=true` / `remove_attachment=true`
- `DELETE /api/todos/:id`

### Paylasim

Asagidaki tum uçlar `Authorization: Bearer <token>` ister:

- `GET /api/share/status`
- `POST /api/share/join` body JSON: `{ "code": "PAYLASIMKODU" }`

### Admin

Asagidaki tum uçlar `Authorization: Bearer <token>` ister ve sadece admin acabilir:

- `GET /api/admin/summary`
- `GET /api/admin/users?limit=120`
- `GET /api/admin/logs?limit=240`
- `DELETE /api/admin/users/:id/todos`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/todos?limit=220`
- `DELETE /api/admin/todos/:id`

## Veri

- `data/todos.db` ilk calistirmada otomatik olusur.
- Yuklenen fotograflar: `public/uploads/`
