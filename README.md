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

Chatbot sử dụng OpenAI Responses API. Thêm khóa chỉ vào `.env` phía backend:

```bash
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-6-luna"
OPENAI_VISION_MODEL="gpt-6-luna"
OPENAI_EMBED_MODEL="text-embedding-3-small"
OPENAI_TIMEOUT_MS=30000
```

Không đặt khóa trong biến `VITE_*`. Model mặc định ưu tiên chi phí thấp; quyền truy cập, hạn mức và ưu đãi miễn phí phụ thuộc project OpenAI của người vận hành. Chatbot không cần tài liệu giáo viên để trả lời kiến thức Sinh học. Backend từ chối câu hỏi ngoài Sinh học, đa dạng sinh học, bảo tồn và môi trường trước khi gọi OpenAI.

Nhận diện thực vật/động vật cũng sử dụng OpenAI Responses API với ảnh đầu vào. API kiểm tra JWT `STUDENT`, giới hạn 5 MB, MIME và chữ ký nhị phân JPEG/PNG/WebP trước khi gửi ảnh. Model trả kết quả theo JSON schema bắt buộc; khi không đủ dấu hiệu phân biệt, giao diện hiển thị rõ là chưa thể xác định thay vì đoán tên loài. `OPENAI_VISION_MODEL` có thể cấu hình riêng và mặc định dùng cùng model tiết kiệm với chatbot.

Kho tài liệu hỗ trợ PDF, DOCX, TXT hoặc Markdown; worker trích xuất, chia đoạn và tạo embedding bằng OpenAI `text-embedding-3-small`. Nếu OpenAI không được cấu hình hoặc xử lý embedding thất bại, tài liệu chuyển sang `FAILED` kèm thông báo thay vì được đánh dấu sẵn sàng với dữ liệu thiếu. Chatbot không phụ thuộc vào kho tài liệu. Nhận diện ảnh lưu lịch sử và đối chiếu tên khoa học dự đoán với bảng `Species`.

## Dữ liệu và an toàn

- Bản đồ nền là OpenStreetMap; phải giữ attribution khi triển khai.
- Bản ghi Sơn Trà trong seed được ghi rõ là dữ liệu phát triển, không có diện tích hoặc tình trạng bảo tồn chưa kiểm chứng.
- API thực thi JWT và vai trò `STUDENT`/`TEACHER` ở server. Điểm thử thách được lấy từ database và cộng trong transaction đúng một lần.
- Chỉ báo cáo `APPROVED` xuất hiện ở endpoint công khai. Tọa độ chính xác cần được làm mờ ở lớp trình bày khi `preciseLocationPublic=false` trước khi production.
- Upload ảnh nhận diện giới hạn mặc định 5 MB, dùng MIME allowlist, kiểm tra magic bytes và tên tệp UUID. Cần thiết lập chính sách lưu/xóa ảnh phù hợp trước khi triển khai production.

## Trạng thái chức năng

Đã có: đăng nhập và route theo vai trò; upload ảnh báo cáo/minh chứng; upload và worker xử lý tài liệu bằng OpenAI Embeddings; chatbot OpenAI có kiểm tra phạm vi backend; AQI US AQI từ Open‑Meteo/CAMS với attribution; nhận diện loài bằng OpenAI Vision; dashboard giáo viên CRUD; hai game lấy câu hỏi từ database; chấm điểm server-side; leaderboard; và Playwright E2E. UI luôn báo lỗi trung thực nếu OpenAI chưa được cấu hình hoặc tạm thời không khả dụng.

## Kiểm tra

```bash
npm run db:generate
npm run build
npm test
npm run test:e2e
```
