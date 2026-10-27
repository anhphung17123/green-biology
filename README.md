# Green Biology

Ứng dụng React/Vite chạy tĩnh trên Vercel, không có NestJS, PostgreSQL hoặc database tự host.

## Dữ liệu

- Sheet `Users` lưu tài khoản đăng nhập: `username`, `pwd`, `name`, `role`.
- Sheet `Config` lưu cấu hình River AI và Species API.
- Thử thách, bảng xếp hạng và thống kê giáo viên là mock data trong `web/src/mock-data.ts`.
- Báo cáo minh họa được lưu trong `localStorage` của trình duyệt.
- OpenStreetMap, Open-Meteo và WAQI được web gọi trực tiếp. River AI và Species API được gọi qua Apps Script để tránh lỗi CORS/cookie.

## Thiết lập Google Sheets

1. Tạo Google Sheet và lấy ID trong URL.
2. Tạo Apps Script, chép `google-apps-script/Code.gs` và `appsscript.json`.
3. Thêm Script Property `SHEET_ID`.
4. Chạy `setup()` một lần để tạo sheet `Users` và `Config`.
5. Có thể thêm tài khoản trực tiếp vào Sheet, ví dụ:

| username | pwd | name | role |
| --- | --- | --- | --- |
| student01 | 123456 | Nguyễn Văn A | STUDENT |
| teacher01 | 123456 | Giáo viên | TEACHER |

Người dùng cũng có thể tự đăng ký trên website. Tài khoản tự đăng ký luôn có role `STUDENT`; tài khoản `TEACHER` chỉ được tạo thủ công trong Sheet.

Trong sheet `Config`, điền giá trị cho các key:

| key | value |
| --- | --- |
| RIVER_API_KEY | Khóa River AI |
| RIVER_BASE_URL | https://api.river.ai/v1 |
| SPECIES_API_URL | https://trituexanhhocduong.4devvn.com/api/identify-species.php |
| SPECIES_API_PHPSESSID | Phiên đăng nhập Species API |

6. Deploy Apps Script dạng Web app, quyền truy cập `Anyone`, rồi lấy URL `/exec`.

## Biến môi trường web

Sao chép `web/.env.example` thành `web/.env` và điền:

```env
VITE_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
VITE_WAQI_MAP_KEY="..."
```

Các biến `VITE_*` được đóng gói công khai vào JavaScript phía trình duyệt.

## Chạy local

```bash
npm --prefix web ci
npm run dev
```

## Deploy Vercel

Import repository với Root Directory là thư mục gốc và khai báo các biến `VITE_*` trên Vercel. `vercel.json` đã cấu hình build trong `web/` và rewrite SPA, nên reload trực tiếp `/chat`, `/explore`, `/login`… không bị 404.

```bash
npm run build
npm run test:e2e
```
