# Green Biology

Ứng dụng gồm frontend React/Vite và backend Node 22 trong `api/`. Backend dùng
`@supabase/server`; dữ liệu và Supabase Auth được quản lý trên Supabase.

Tài liệu đầy đủ về kiến trúc, chức năng, dữ liệu, API, triển khai, kiểm thử và vận hành: [docs/WEBSITE.md](docs/WEBSITE.md).

## Dữ liệu

- Supabase có các bảng tương ứng dữ liệu cũ: `Users`, `Config`, `Reports`,
  `Challenges`, `ChallengeProofs`.
- Supabase Auth quản lý mật khẩu và cấp JWT. `Users` chỉ lưu hồ sơ/role, không lưu
  mật khẩu rõ.
- OpenStreetMap, Open-Meteo và WAQI vẫn được web gọi trực tiếp. River AI,
  Species API và ImgBB được gọi qua backend để bảo vệ khóa và tránh lỗi CORS.

## Thiết lập backend

Xem [api/README.md](api/README.md). Chạy migration trong `api/supabase/migrations`,
sau đó tạo `api/.env` từ `api/.env.example` và chạy `npm --prefix api run dev`.

## Biến môi trường web

Sao chép `web/.env.example` thành `web/.env` và điền:

```env
VITE_SUPABASE_API_URL="http://localhost:3000"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_WAQI_MAP_KEY="..."
VITE_GOOGLE_MAPS_API_KEY="..."
VITE_GOOGLE_MAPS_MAP_ID="..."
```

Các biến `VITE_*` được đóng gói công khai vào JavaScript phía trình duyệt.

## Chạy local

```bash
npm --prefix web ci
npm run dev
```

## Deploy Vercel

Import repository với **Root Directory = `web`** và khai báo các biến `VITE_*` trên Vercel. `vercel.json` đã cấu hình build và rewrite SPA, nên reload trực tiếp `/chat`, `/explore`, `/login`… không bị 404.

```bash
npm run build
npm run test:e2e
```
