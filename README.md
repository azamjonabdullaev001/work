# FreelanceHub — Фриланс платформа (Upwork клон)

## Loyiha haqida (O'zbekcha)

Bu loyiha Upwork ga o'xshash freelance platforma bo'lib, unda ikki turdagi foydalanuvchilar ro'yxatdan o'tishi mumkin:

- **Freelancer (Ijodkor)** — ish qidiruvchilar, o'z ko'nikmalarini ko'rsatadilar
- **Client (Buyurtmachi)** — biror narsa yasashni xohlovchilar, buyurtma beradilar

## Texnologiyalar

| Komponent | Texnologiya |
|-----------|------------|
| Backend | Go (Golang) + Chi router |
| Ma'lumotlar bazasi | PostgreSQL 16 |
| Frontend | React 18 |
| Konteynerlar | Docker + Docker Compose |

## Loyiha tuzilishi

```
WORK/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── cmd/main.go              # Kirish nuqtasi
│   ├── internal/
│   │   ├── config/config.go     # Konfiguratsiya
│   │   ├── database/postgres.go # DB ulanish
│   │   ├── middleware/auth.go   # JWT autentifikatsiya
│   │   ├── models/              # Ma'lumot modellari
│   │   ├── handlers/            # HTTP handlerlar
│   │   └── routes/routes.go     # Marshrutlar
│   └── migrations/001_init.sql  # DB migratsiya
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── nginx.conf
│   ├── public/index.html
│   └── src/
│       ├── App.js               # Asosiy komponent
│       ├── App.css              # Global stillar
│       ├── api/api.js           # API funksiyalar
│       ├── context/AuthContext.js
│       ├── components/          # Qayta ishlatiladigan komponentlar
│       └── pages/               # Sahifalar
```

## Ishga tushirish

### Docker bilan (tavsiya etiladi):

```bash
cd WORK
docker-compose up --build
```

Keyin brauzerda oching: **http://localhost:3000**

### Qo'lda ishga tushirish:

#### 1. PostgreSQL ni ishga tushiring:
```bash
docker run -d --name freelance_db \
  -e POSTGRES_DB=freelance_platform \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  postgres:16-alpine
```

Migratsiyani bajarish:
```bash
psql -h localhost -U postgres -d freelance_platform -f backend/migrations/001_init.sql
```

#### 2. Backend:
```bash
cd backend
go mod tidy
go run cmd/main.go
```

Server **http://localhost:8080** da ishlaydi.

#### 3. Frontend:
```bash
cd frontend
npm install
npm start
```

Loyiha **http://localhost:3000** da ochiladi.

## API Endpointlar

### Ochiq (public):
| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| POST | `/api/auth/register` | Ro'yxatdan o'tish |
| POST | `/api/auth/login` | Kirish |
| GET | `/api/categories` | Kategoriyalar |
| GET | `/api/skills` | Ko'nikmalar |
| GET | `/api/jobs` | Buyurtmalar ro'yxati |
| GET | `/api/jobs/:id` | Bitta buyurtma |
| GET | `/api/profile/:id` | Profil ko'rish |
| GET | `/api/freelancers` | Freelancerlarni qidirish |
| GET | `/api/reviews/:id` | Sharhlar |

### Himoyalangan (token kerak):
| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/auth/me` | Joriy foydalanuvchi |
| PUT | `/api/profile` | Profilni yangilash |
| POST | `/api/profile/avatar` | Avatar yuklash |
| POST | `/api/jobs` | Buyurtma yaratish (client) |
| GET | `/api/jobs/my` | Mening buyurtmalarim |
| DELETE | `/api/jobs/:id` | Buyurtmani o'chirish |
| GET | `/api/portfolio` | Portfolio |
| POST | `/api/portfolio` | Portfolio qo'shish |
| PUT | `/api/portfolio/:id` | Portfolioni yangilash |
| DELETE | `/api/portfolio/:id` | Portfolioni o'chirish |
| POST | `/api/jobs/:id/proposals` | Taklif yuborish (freelancer) |
| GET | `/api/jobs/:id/proposals` | Takliflar (client) |
| GET | `/api/proposals/my` | Mening takliflarim |
| PUT | `/api/proposals/:id/accept` | Taklifni qabul qilish |
| POST | `/api/reviews` | Sharh yozish |

## Ro'yxatdan o'tish

### Ikki turdagi ro'yxatdan o'tish:

**Freelancer (Ijodkor) uchun:**
- Ism * (majburiy)
- Familiya * (majburiy)
- Otasining ismi (ixtiyoriy)
- Telefon raqami * (majburiy, unikal)
- Parol * (6+ belgi)
- Parolni takrorlash *

**Client (Buyurtmachi) uchun:**
- Xuddi shunday maydonlar

Telefon raqami har bir foydalanuvchi uchun unikal bo'lishi kerak.

## Asosiy xususiyatlar

- ✅ Ikki turdagi ro'yxatdan o'tish (Freelancer / Client)
- ✅ JWT autentifikatsiya
- ✅ Profil boshqaruvi (avatar, bio, ko'nikmalar)
- ✅ Portfolio boshqaruvi (bosh loyiha belgilash)
- ✅ Buyurtma yaratish va qidirish
- ✅ Takliflar tizimi
- ✅ Sharh va reyting tizimi
- ✅ Freelancerlarni qidirish va filtrlash
- ✅ Kategoriya va ko'nikmalar bo'yicha filtrlash
- ✅ Responsive dizayn (mobil versiya)
- ✅ Docker konteynerizatsiya
