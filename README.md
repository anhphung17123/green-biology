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

Chatbot sử dụng Gemini API; nhận diện ảnh động vật sử dụng Animal Detect. Thêm khóa chỉ vào `.env` phía backend:

```bash
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-3.5-flash"
GEMINI_TIMEOUT_MS=60000
ANIMAL_DETECT_API_KEY="..."
ANIMAL_DETECT_COUNTRY="VNM"
ANIMAL_DETECT_THRESHOLD=0.2
ANIMAL_DETECT_TIMEOUT_MS=30000
```

Không đặt khóa trong biến `VITE_*`. Quyền truy cập và hạn mức phụ thuộc project Gemini và tài khoản Animal Detect của người vận hành. Chatbot không cần tài liệu giáo viên để trả lời kiến thức Sinh học. Backend từ chối câu hỏi ngoài Sinh học, đa dạng sinh học, bảo tồn và môi trường trước khi gọi Gemini.

Nhận diện động vật xử lý ảnh tạm thời trong RAM và gửi bằng multipart tới Animal Detect; ảnh không được ghi vào thư mục upload hoặc database. API kiểm tra JWT `STUDENT`, giới hạn 5 MB, MIME và chữ ký nhị phân JPEG/PNG/WebP trước khi gửi ảnh. Kết quả gồm nhãn, taxonomy và điểm tin cậy; khi không phát hiện động vật vượt ngưỡng, giao diện hiển thị rõ là chưa thể xác định. Có thể cấu hình gợi ý quốc gia và ngưỡng bằng `ANIMAL_DETECT_COUNTRY` và `ANIMAL_DETECT_THRESHOLD`.

Kho tài liệu hỗ trợ PDF, DOCX, TXT hoặc Markdown; worker trích xuất và chia đoạn văn bản để quản lý nội dung, không tạo embedding. Chatbot không phụ thuộc vào kho tài liệu. Nhận diện ảnh lưu lịch sử và đối chiếu tên khoa học dự đoán với bảng `Species`.

## Dữ liệu và an toàn

- Bản đồ nền là OpenStreetMap; phải giữ attribution khi triển khai.
- Bản ghi Sơn Trà trong seed được ghi rõ là dữ liệu phát triển, không có diện tích hoặc tình trạng bảo tồn chưa kiểm chứng.
- API thực thi JWT và vai trò `STUDENT`/`TEACHER` ở server. Điểm thử thách được lấy từ database và cộng trong transaction đúng một lần.
- Chỉ báo cáo `APPROVED` xuất hiện ở endpoint công khai. Tọa độ chính xác cần được làm mờ ở lớp trình bày khi `preciseLocationPublic=false` trước khi production.
- Upload ảnh nhận diện giới hạn mặc định 5 MB, dùng MIME allowlist, kiểm tra magic bytes và tên tệp UUID. Cần thiết lập chính sách lưu/xóa ảnh phù hợp trước khi triển khai production.

## Trạng thái chức năng

Đã có: đăng nhập và route theo vai trò; upload ảnh báo cáo/minh chứng; upload và worker trích xuất/chia đoạn tài liệu; chatbot Gemini có kiểm tra phạm vi Sinh học ở backend; AQI US AQI từ Open‑Meteo/CAMS với attribution; nhận diện động vật bằng Animal Detect; dashboard giáo viên CRUD; hai game lấy câu hỏi từ database; chấm điểm server-side; leaderboard; và Playwright E2E. UI luôn báo lỗi trung thực nếu dịch vụ AI chưa được cấu hình hoặc tạm thời không khả dụng.

## Kiểm tra

```bash
npm run db:generate
npm run build
npm test
npm run test:e2e
```
