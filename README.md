# Green Biology

Nền tảng học Sinh học gồm hai ứng dụng độc lập:

- `api/`: NestJS, Prisma và PostgreSQL.
- `web/`: React và Vite; chỉ giao tiếp với API qua `VITE_API_URL`.

Mỗi ứng dụng có `package.json`, `package-lock.json`, `.env.example`, `node_modules` và `Dockerfile` riêng, nên có thể cài đặt, build và deploy độc lập. Các script ở root chỉ điều phối hai ứng dụng bằng `npm --prefix`, không dùng npm workspaces và không hoist dependency.

## Phát triển cục bộ

Yêu cầu Node.js 20+, npm 10+ và Docker.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm --prefix api ci
npm --prefix web ci
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/docs
- PostgreSQL: `127.0.0.1:55432`

## Deploy API riêng

```bash
cd api
cp .env.example .env
npm ci
npm run prisma:generate
npm run build
npm start
```

```bash
docker build -t green-biology-api ./api
```

API cần `DATABASE_URL`, `JWT_SECRET` và `WEB_ORIGIN`. Các khóa River AI và Species API chỉ đặt ở API, không đưa sang web.

## Deploy web riêng

```bash
cd web
cp .env.example .env
npm ci
npm run build
npm run preview
```

```bash
docker build --build-arg VITE_API_URL=https://api.example.com/api -t green-biology-web ./web
```

## Kiểm tra

```bash
cd api && npm test
cd ../web && npm run build
```

E2E cần API đã được build trước:

```bash
cd api && npm run build
cd ../web && npm run test:e2e
```
