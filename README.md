# Green Biology — Explore Life, Protect the Environment

Monorepo thử nghiệm cho nền tảng học và trải nghiệm Sinh học THPT. Giao diện dùng React/Vite; REST API dùng NestJS; dữ liệu dùng PostgreSQL/Prisma. Hệ thống không tạo dữ liệu AQI hoặc kết quả AI giả khi dịch vụ chưa sẵn sàng.

## Chạy cục bộ

Yêu cầu: Node.js 20+, npm 10+, Docker Desktop.

```bash
cp .env.example .env # bỏ qua nếu tệp .env đã tồn tại
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Chạy từng dòng lệnh riêng. Những dòng bắt đầu bằng `#` là chú thích; không cần dán chúng vào zsh. Các lệnh `db:*` tự nạp tệp `.env` ở thư mục gốc, kể cả khi Prisma chạy trong workspace `apps/api`.

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/docs
- PostgreSQL của dự án được xuất ra cổng `55432` để tránh xung đột với các PostgreSQL cục bộ thường dùng cổng `5432` hoặc `5433`.
- Tài khoản phát triển sau khi seed: `student@example.local` hoặc `teacher@example.local`, mật khẩu `GreenBio123!`. Đây là dữ liệu phát triển, không dùng trong production.

## AI

Chatbot sử dụng River AI qua API tương thích OpenAI; nhận diện ảnh sử dụng Species API. Thêm thông tin xác thực chỉ vào `.env` phía backend:

```bash
RIVER_API_KEY="..."
RIVER_BASE_URL="https://api.river.ai/v1"
RIVER_TIMEOUT_MS=60000
SPECIES_API_URL="https://trituexanhhocduong.4devvn.com/api/identify-species.php"
SPECIES_API_PHPSESSID="..."
SPECIES_API_TIMEOUT_MS=60000
```

Không đặt khóa hoặc cookie phiên trong biến `VITE_*`. Quyền truy cập model và hạn mức phụ thuộc tài khoản River; phiên Species API có thể hết hạn và cần được cập nhật. Chatbot không cần tài liệu giáo viên để trả lời kiến thức Sinh học. Backend từ chối câu hỏi ngoài phạm vi trước khi gọi River AI.

Website gọi `POST /api/biology-chat/ask` và `POST /api/species-recognition`; các alias `POST /api/chat-biology` và `POST /api/classify-animal` cũng có sẵn. Ảnh được kiểm tra MIME/chữ ký, giới hạn bởi `MAX_UPLOAD_BYTES`, gửi multipart từ backend tới Species API và không được ghi xuống đĩa. Backend chấp nhận `RIVER_BASE_URL` có hoặc không có hậu tố `/v1` cho chatbot.

Nhận diện động vật xử lý ảnh tạm thời trong RAM và gửi tới Species API; ảnh không được ghi vào thư mục upload hoặc database. Route của website kiểm tra JWT `STUDENT`, giới hạn 5 MB, MIME và chữ ký nhị phân JPEG/PNG/WebP. Giao diện hiển thị tên loài, mức nguy cấp, độ tin cậy, đặc điểm, sinh cảnh, hướng dẫn bảo tồn, fun facts và câu hỏi ôn tập từ response đã được backend kiểm tra.

Kho tài liệu hỗ trợ PDF, DOCX, TXT hoặc Markdown; worker trích xuất và chia đoạn văn bản để quản lý nội dung, không tạo embedding. Chatbot không phụ thuộc vào kho tài liệu. Nhận diện ảnh lưu lịch sử và đối chiếu tên khoa học dự đoán với bảng `Species`.

## Dữ liệu và an toàn

- Bản đồ nền là OpenStreetMap; phải giữ attribution khi triển khai.
- Bản ghi Sơn Trà trong seed được ghi rõ là dữ liệu phát triển, không có diện tích hoặc tình trạng bảo tồn chưa kiểm chứng.
- API thực thi JWT và vai trò `STUDENT`/`TEACHER` ở server. Điểm thử thách được lấy từ database và cộng trong transaction đúng một lần.
- Chỉ báo cáo `APPROVED` xuất hiện ở endpoint công khai. Tọa độ chính xác cần được làm mờ ở lớp trình bày khi `preciseLocationPublic=false` trước khi production.
- Upload ảnh nhận diện giới hạn mặc định 5 MB, dùng MIME allowlist, kiểm tra magic bytes và tên tệp UUID. Cần thiết lập chính sách lưu/xóa ảnh phù hợp trước khi triển khai production.

## Trạng thái chức năng

Đã có: đăng nhập và route theo vai trò; upload ảnh báo cáo/minh chứng; upload và worker trích xuất/chia đoạn tài liệu; chatbot River AI có kiểm tra phạm vi Sinh học ở backend; AQI US AQI từ Open‑Meteo/CAMS với attribution; nhận diện động vật bằng Species API; dashboard giáo viên CRUD; hai game lấy câu hỏi từ database; chấm điểm server-side; leaderboard; và Playwright E2E.

## Kiểm tra

```bash
npm run db:generate
npm run build
npm test
npm run test:e2e
```
