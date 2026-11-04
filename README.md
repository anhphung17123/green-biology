# Green Biology

Ứng dụng React/Vite chạy tĩnh trên Vercel, không có NestJS, PostgreSQL hoặc database tự host.

Tài liệu đầy đủ về kiến trúc, chức năng, dữ liệu, API, triển khai, kiểm thử và vận hành: [docs/WEBSITE.md](docs/WEBSITE.md).

## Dữ liệu

- Sheet `Users` lưu tài khoản đăng nhập: `username`, `pwd`, `name`, `role`.
- Sheet `Config` lưu cấu hình River AI và Species API.
- Thử thách, bảng xếp hạng và thống kê giáo viên là mock data trong `web/src/mock-data.ts`.
- Báo cáo minh họa được lưu trong `localStorage` của trình duyệt.
- OpenStreetMap, Open-Meteo và WAQI được web gọi trực tiếp. River AI và Species API được gọi qua Apps Script để tránh lỗi CORS/cookie.

## Thiết lập Nơi lưu trữ

1. Tạo Google Sheet và lấy ID trong URL.
2. Tạo Apps Script, chép `google-apps-script/Code.gs` và `appsscript.json`.
3. Thêm Script Property `SHEET_ID`.
4. Chạy `setup()` một lần để tạo sheet `Users` và `Config`.
5. Có thể thêm tài khoản trực tiếp vào Sheet, ví dụ:

| username  | pwd    | name         | role    |
| --------- | ------ | ------------ | ------- |
| student01 | 123456 | Nguyễn Văn A | STUDENT |
| teacher01 | 123456 | Giáo viên    | TEACHER |

Người dùng cũng có thể tự đăng ký trên website. Tài khoản tự đăng ký luôn có role `STUDENT`; tài khoản `TEACHER` chỉ được tạo thủ công trong Sheet.

Trong sheet `Config`, điền giá trị cho các key:

| key                   | value                                                          |
| --------------------- | -------------------------------------------------------------- |
| RIVER_API_KEY         | Khóa River AI                                                  |
| RIVER_BASE_URL        | https://api.river.ai/v1                                        |
| SPECIES_API_URL       | https://trituexanhhocduong.4devvn.com/api/identify-species.php |
| SPECIES_API_PHPSESSID | Phiên đăng nhập Species API                                    |
| IMGBB_API_KEY         | Khóa API v1 của ImgBB dùng để tải ảnh minh chứng               |

6. Deploy Apps Script dạng Web app, quyền truy cập `Anyone`, rồi lấy URL `/exec`.

Sau khi cập nhật Apps Script, chạy lại hàm `setup()` để tạo các sheet
`Reports`, `Challenges`, `ChallengeProofs`, sau đó tạo deployment version mới.
Ảnh của báo cáo và minh chứng thử thách được tải lên ImgBB; ứng dụng chỉ lưu URL công khai trong Google Sheet. Ảnh dùng cho nhận diện loài chỉ được gửi đến Species API để phân tích, không được tải lên ImgBB. Nên đặt `IMGBB_API_KEY` trong Apps Script → Project Settings → Script Properties; cấu hình trong sheet `Config` chỉ là phương án dự phòng.

## Biến môi trường web

Sao chép `web/.env.example` thành `web/.env` và điền:

```env
VITE_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
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
