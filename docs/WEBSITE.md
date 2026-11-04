# Tài liệu website Green Biology

> Tài liệu kỹ thuật và vận hành cho phiên bản website hiện tại. Cập nhật theo mã nguồn ngày 03/11/2026.

## 1. Tổng quan

Green Biology là nền tảng học tập sinh học và môi trường bằng tiếng Việt. Website hướng đến hai nhóm người dùng:

- **Học sinh**: khám phá khu bảo tồn, theo dõi chất lượng không khí, hỏi AI, nhận diện động vật, gửi báo cáo môi trường, tham gia thử thách và tích điểm.
- **Giáo viên**: duyệt báo cáo/minh chứng và quản lý thử thách.

Phiên bản đang được frontend sử dụng là một **Single Page Application (SPA)** chạy tĩnh. Dữ liệu tài khoản và hoạt động được lưu trong Google Sheets, còn Google Apps Script đóng vai trò lớp API/proxy.

Thư mục `api/` là một backend NestJS/Prisma/PostgreSQL riêng, hiện **không được `web/` gọi**. Không cần chạy PostgreSQL hoặc NestJS để vận hành website hiện tại.

## 2. Kiến trúc hệ thống

```text
Trình duyệt
  └─ React + Vite SPA
      ├─ Google Apps Script Web App
      │   ├─ Google Sheets: Users, Config, Reports, Challenges, ChallengeProofs
      │   ├─ River AI: trả lời câu hỏi sinh học
      │   └─ Species API: nhận diện động vật
      ├─ Google Maps JavaScript API: bản đồ khu bảo tồn/báo cáo
      ├─ Open-Meteo Air Quality API: AQI tại vị trí người dùng
      ├─ WAQI Map API: các trạm quan trắc trong vùng bản đồ
      └─ Liên kết ngoài: Gemini games và Canva magazine
```

### Thành phần chính

| Thành phần | Công nghệ | Trách nhiệm |
| --- | --- | --- |
| `web/` | React 18, TypeScript, Vite 6 | Giao diện SPA và logic phía trình duyệt |
| `google-apps-script/` | Apps Script | API JSON, phân quyền cơ bản, truy cập Sheet, proxy dịch vụ AI |
| Google Sheets | Bảng tính | Kho dữ liệu vận hành của phiên bản hiện tại |
| Vercel | Static hosting | Build và phục vụ frontend, rewrite mọi route về `index.html` |
| `api/` | NestJS, Prisma, PostgreSQL | Backend thay thế/di sản, chưa nối với frontend hiện tại |

## 3. Cấu trúc mã nguồn

```text
.
├── web/
│   ├── src/
│   │   ├── pages/             # Các trang chức năng
│   │   ├── components/        # Loading và quản lý thử thách
│   │   ├── data/              # Dữ liệu khu bảo tồn và dữ liệu bản đồ
│   │   ├── api.ts             # Client của Google Apps Script
│   │   ├── auth.tsx           # Auth context và phiên localStorage
│   │   ├── google-maps.ts     # Nạp Google Maps SDK
│   │   ├── App.tsx            # Layout, navigation, routes, route guards
│   │   └── styles.css         # CSS chính
│   ├── e2e/core.spec.ts       # Playwright end-to-end tests
│   ├── vite.config.ts
│   └── vercel.json
├── google-apps-script/
│   ├── Code.gs                # Web App API và setup Sheet
│   └── appsscript.json
├── api/                       # Backend NestJS hiện không được web sử dụng
├── docker-compose.yml         # PostgreSQL dành cho backend NestJS
├── package.json               # Script tiện ích gọi sang web/
└── README.md                  # Hướng dẫn khởi động nhanh
```

## 4. Chức năng và routes

| Route | Màn hình | Công khai | Nguồn dữ liệu/chức năng |
| --- | --- | --- | --- |
| `/` | Trang chủ | Có | Nội dung tĩnh, liên kết nhanh |
| `/explore` | Khám phá khu bảo tồn | Có | Dữ liệu tĩnh trong `web/src/data`, Google Maps, báo cáo đã duyệt |
| `/air-quality` | Chất lượng không khí | Có | Open-Meteo, WAQI và vị trí trình duyệt |
| `/games` | Trò chơi | Có | Mở hai trò chơi được chia sẻ từ Gemini |
| `/chat` | Hỏi AI | Có | River AI qua Apps Script |
| `/magazine` | Tạp chí | Có | Mở ấn phẩm Canva bên ngoài |
| `/challenges` | Thử thách xanh | Có | Danh sách từ Sheet; học sinh đăng nhập mới gửi minh chứng được; giáo viên thấy giao diện quản lý |
| `/leaderboard` | Bảng xếp hạng | Có | Tổng điểm từ minh chứng được duyệt |
| `/login` | Đăng nhập/đăng ký | Có | Sheet `Users` |
| `/recognition` | Nhận diện động vật | Không | Ảnh gửi qua Apps Script đến Species API |
| `/reports` | Báo cáo môi trường | Không | Vị trí, URL ảnh và Sheet `Reports` |
| `/my-activities` | Hoạt động của tôi | Không | Báo cáo và minh chứng của tài khoản hiện tại |
| `/teacher` | Duyệt hoạt động | Chỉ giáo viên | Duyệt báo cáo và minh chứng |

Route không yêu cầu đăng nhập vẫn có thể thay đổi hành vi theo vai trò. Ví dụ `/challenges` hiển thị công cụ quản lý khi người dùng là giáo viên.

## 5. Vai trò và phân quyền

### Khách

- Xem các trang công khai.
- Xem báo cáo đã được duyệt, thử thách và bảng xếp hạng.
- Sử dụng chat AI và các liên kết nội dung bên ngoài.

### Học sinh (`STUDENT`)

- Có toàn bộ quyền của khách.
- Gửi báo cáo môi trường và minh chứng thử thách.
- Dùng nhận diện động vật.
- Xem lịch sử hoạt động cá nhân.
- Tích điểm khi giáo viên duyệt minh chứng.

Tài khoản đăng ký từ giao diện luôn được tạo với vai trò `STUDENT`.

### Giáo viên (`TEACHER`)

- Xem và duyệt/từ chối mọi báo cáo.
- Xem và duyệt/từ chối mọi minh chứng.
- Tạo, sửa và xóa thử thách chưa có minh chứng.
- Tài khoản giáo viên phải được tạo/sửa thủ công trong Sheet `Users`.

`Protected` trong `App.tsx` bảo vệ route ở giao diện. Apps Script kiểm tra lại tài khoản/vai trò cho các thao tác giáo viên bằng `requireTeacher_()`.

## 6. Các luồng nghiệp vụ chính

### 6.1 Đăng ký và đăng nhập

1. Người dùng nhập thông tin tại `/login`.
2. Frontend gửi action `register` hoặc `login` đến Apps Script.
3. Apps Script đọc/ghi Sheet `Users`.
4. Frontend lưu object người dùng vào `localStorage` với key `green_user`.
5. Khi tải lại trang, `AuthProvider` khôi phục phiên từ localStorage.

Tên đăng nhập mới phải dài 3–40 ký tự và chỉ gồm chữ thường, số, `.`, `_`, `-`; mật khẩu đăng ký tối thiểu 6 ký tự; họ tên dài 2–80 ký tự.

### 6.2 Báo cáo vấn đề môi trường

1. Học sinh mở `/reports`, cho phép trình duyệt lấy vị trí hoặc dùng tọa độ mặc định Đà Nẵng.
2. Học sinh nhập tiêu đề, mô tả, loại sự cố và từ 1 đến 6 URL ảnh công khai.
3. Báo cáo được lưu với trạng thái `PENDING`.
4. Giáo viên duyệt thành `APPROVED` hoặc `REJECTED` tại `/teacher`.
5. Báo cáo đã duyệt xuất hiện công khai trong album ở trang Khám phá; học sinh luôn xem được báo cáo của chính mình.

Website chỉ lưu **URL ảnh**, không tải file ảnh lên Google Drive hay server.

### 6.3 Thử thách và điểm xanh

1. Giáo viên tạo thử thách gồm mục tiêu, số điểm, hạn hoàn thành và yêu cầu minh chứng.
2. Học sinh gửi URL ảnh cùng ghi chú.
3. Giáo viên duyệt hoặc từ chối minh chứng.
4. Điểm người dùng được tính động bằng tổng điểm của các minh chứng `APPROVED`.
5. Bảng xếp hạng sắp xếp học sinh theo tổng điểm giảm dần.

Việc đổi trạng thái minh chứng từ chấp nhận sang từ chối sẽ làm điểm được tính lại; không có cột điểm tích lũy riêng trong Sheet `Users`.

### 6.4 Hỏi AI

Frontend gửi câu hỏi dài 3–1000 ký tự qua action `chat`. Apps Script gọi endpoint tương thích OpenAI của River AI với model `deepseek-ai/DeepSeek-V4.1-Flash`. System prompt giới hạn chủ đề trong sinh học, môi trường và bảo tồn bằng tiếng Việt.

### 6.5 Nhận diện động vật

Frontend chỉ nhận JPEG, PNG hoặc WebP, tối đa 5 MB. File được chuyển thành Base64, gửi qua Apps Script, sau đó Apps Script tạo blob và chuyển tiếp đến Species API cùng cookie phiên `PHPSESSID`. Kết quả gồm tên loài, đặc điểm, môi trường sống, mức bảo tồn và nội dung ôn tập tùy dữ liệu API trả về.

### 6.6 Chất lượng không khí

- Open-Meteo cung cấp chỉ số tại vị trí hiện tại.
- WAQI cung cấp danh sách trạm theo vùng bản đồ.
- Nếu người dùng từ chối vị trí, trang dùng vị trí mặc định được khai báo trong mã nguồn.
- API key WAQI nằm trong bundle frontend nên phải được giới hạn quota/phạm vi nếu nhà cung cấp hỗ trợ.

## 7. Dữ liệu Google Sheets

Chạy hàm `setup()` trong Apps Script để tạo các sheet và header. Không đổi tên cột hoặc thứ tự cột nếu chưa cập nhật `Code.gs`.

### `Users`

| Cột | Ý nghĩa |
| --- | --- |
| `username` | Định danh duy nhất, không phân biệt hoa/thường khi tra cứu |
| `pwd` | Mật khẩu hiện đang lưu dạng rõ |
| `name` | Tên hiển thị |
| `role` | `STUDENT` hoặc `TEACHER` |

### `Config`

| Key | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `RIVER_API_KEY` | Cho chat | Khóa River AI |
| `RIVER_BASE_URL` | Không | Mặc định `https://api.river.ai/v1` |
| `SPECIES_API_URL` | Không | Endpoint nhận diện loài |
| `SPECIES_API_PHPSESSID` | Cho nhận diện | Cookie phiên còn hiệu lực của Species API |

### `Reports`

`id`, `title`, `description`, `incidentType`, `latitude`, `longitude`, `imageUrls`, `studentUsername`, `studentName`, `status`, `createdAt`, `reviewedAt`, `reviewedBy`.

`imageUrls` là chuỗi JSON. Trạng thái gồm `PENDING`, `APPROVED`, `REJECTED`.

### `Challenges`

`id`, `title`, `description`, `target`, `points`, `endsAt`, `proofInstructions`, `active`.

`setup()` thêm năm thử thách mẫu nếu sheet chỉ có header.

### `ChallengeProofs`

`id`, `challengeId`, `studentUsername`, `studentName`, `imageUrl`, `note`, `status`, `createdAt`, `reviewedAt`, `reviewedBy`.

Hiện không có ràng buộc ngăn một học sinh gửi nhiều minh chứng cho cùng thử thách.

## 8. API Google Apps Script

Mọi thao tác dùng `POST` với body JSON và header `Content-Type: text/plain;charset=utf-8` để giảm vấn đề preflight CORS. Response có dạng:

```json
{ "ok": true, "data": {} }
```

hoặc:

```json
{ "ok": false, "message": "Mô tả lỗi" }
```

| Action | Quyền | Mục đích |
| --- | --- | --- |
| `register` | Công khai | Tạo học sinh |
| `login` | Công khai | Kiểm tra username/password |
| `chat` | Công khai | Proxy River AI |
| `recognize` | Giao diện yêu cầu đăng nhập | Proxy Species API |
| `createReport` | Tài khoản hợp lệ | Tạo báo cáo |
| `listReports` | Công khai | Lọc dữ liệu theo vai trò/người dùng |
| `reviewReport` | Giáo viên | Duyệt báo cáo |
| `listChallenges` | Công khai | Liệt kê thử thách active |
| `createChallenge` | Giáo viên | Tạo thử thách |
| `updateChallenge` | Giáo viên | Sửa thử thách |
| `deleteChallenge` | Giáo viên | Xóa thử thách chưa có minh chứng |
| `submitChallengeProof` | Tài khoản hợp lệ | Gửi minh chứng |
| `listChallengeProofs` | Đăng nhập | Danh sách cá nhân hoặc toàn bộ cho giáo viên |
| `reviewChallengeProof` | Giáo viên | Duyệt minh chứng |
| `listLeaderboard` | Công khai | Tính và trả bảng điểm |

`GET` vào Apps Script chỉ trả thông tin kiểm tra service.

## 9. Biến môi trường

Tạo `web/.env` từ `web/.env.example`:

```env
VITE_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
VITE_WAQI_MAP_KEY="..."
VITE_GOOGLE_MAPS_API_KEY="..."
VITE_GOOGLE_MAPS_MAP_ID="..."
```

| Biến | Dùng ở đâu | Ghi chú |
| --- | --- | --- |
| `VITE_GOOGLE_SCRIPT_URL` | Tất cả dữ liệu động | URL deployment `/exec` |
| `VITE_WAQI_MAP_KEY` | `/air-quality` | Khóa bản đồ WAQI |
| `VITE_GOOGLE_MAPS_API_KEY` | `/explore`, `/reports` | Khóa Google Maps JS |
| `VITE_GOOGLE_MAPS_MAP_ID` | Google Maps | Map ID cho Advanced Marker |

Mọi biến có tiền tố `VITE_` đều được đóng gói vào JavaScript công khai. Không đặt River key, mật khẩu, session cookie hoặc secret server trong `web/.env`. Các secret của River/Species phải nằm trong Sheet `Config` mà Apps Script đọc ở phía server.

## 10. Cài đặt và chạy local

Yêu cầu Node.js 20 trở lên.

```bash
npm --prefix web ci
cp web/.env.example web/.env
# Điền các biến trong web/.env
npm run dev
```

Vite chạy mặc định tại `http://localhost:5173`.

Build production:

```bash
npm run build
```

Xem bản build local:

```bash
npm --prefix web run preview
```

## 11. Thiết lập Google Apps Script

1. Tạo một Google Sheet và lấy ID từ URL.
2. Tạo dự án Apps Script.
3. Chép nội dung `google-apps-script/Code.gs` và `appsscript.json` vào dự án.
4. Trong **Project Settings → Script Properties**, thêm `SHEET_ID` bằng ID của Sheet.
5. Chạy `setup()` một lần và cấp các quyền được yêu cầu.
6. Điền các secret cần thiết vào Sheet `Config`.
7. Thêm tài khoản giáo viên thủ công vào `Users` với role `TEACHER`.
8. Chọn **Deploy → New deployment → Web app**; execute as owner và cho phép `Anyone` truy cập.
9. Sao chép URL kết thúc bằng `/exec` vào `VITE_GOOGLE_SCRIPT_URL`.

Sau mỗi lần sửa `Code.gs`, tạo deployment version mới. Chỉ bấm Save không làm deployment đang dùng tự cập nhật.

## 12. Deploy Vercel

Khuyến nghị import repository và đặt **Root Directory** là `web`.

- Install command: `npm install` hoặc `npm ci`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Khai báo đủ bốn biến `VITE_*` trong môi trường Production/Preview cần dùng.

`web/vercel.json` rewrite mọi đường dẫn về `/index.html`, vì vậy reload trực tiếp `/explore`, `/chat` hoặc route SPA khác không gây 404.

Sau deploy, kiểm tra ít nhất đăng nhập, đọc danh sách thử thách, Google Maps, AQI, chat và nhận diện.

## 13. Kiểm thử

### Kiểm tra tự động

```bash
npm run build
npm run test:e2e
```

Playwright hiện kiểm tra các luồng giao diện cốt lõi, gồm điều hướng và menu responsive. Một số luồng phụ thuộc API ngoài nên cần biến môi trường và deployment Apps Script hoạt động.

### Checklist kiểm thử thủ công

- Đăng ký học sinh mới, đăng xuất và đăng nhập lại.
- Khách chỉ thấy báo cáo đã duyệt.
- Học sinh gửi báo cáo và xem trạng thái trong “Hoạt động của tôi”.
- Giáo viên duyệt báo cáo; báo cáo xuất hiện trong Khám phá.
- Giáo viên tạo thử thách; học sinh gửi minh chứng; giáo viên duyệt; điểm tăng đúng.
- Chat trả Markdown/công thức đúng định dạng.
- Ảnh sai định dạng hoặc lớn hơn 5 MB bị chặn ở trang nhận diện.
- Từ chối geolocation không làm trang AQI/báo cáo bị treo.
- Menu hoạt động ở desktop và mobile; Escape/overlay đóng menu.

## 14. Vận hành và xử lý lỗi

| Hiện tượng | Kiểm tra |
| --- | --- |
| “Thiếu VITE_GOOGLE_SCRIPT_URL” | `web/.env` hoặc biến Vercel, sau đó build/deploy lại |
| “Không thể kết nối Google Sheets” | URL `/exec`, quyền deployment `Anyone`, deployment version mới |
| “Chưa có sheet …” | Chạy `setup()` và kiểm tra `SHEET_ID` |
| Chat không trả lời | `RIVER_API_KEY`, `RIVER_BASE_URL`, quota và trạng thái River AI |
| Nhận diện thất bại | `SPECIES_API_PHPSESSID` còn hạn, URL API, kích thước/định dạng ảnh |
| Không thấy Google Maps | API key, Map ID, billing, HTTP referrer restrictions và console trình duyệt |
| Không thấy trạm AQI | `VITE_WAQI_MAP_KEY`, quota WAQI hoặc vùng bản đồ hiện tại |
| Dữ liệu vừa sửa chưa đổi | Cache in-memory của `web/src/api.ts`; reload trang hoặc kiểm tra invalidation tương ứng |
| Sửa Apps Script không có hiệu lực | Tạo version/deployment mới và xác nhận URL deployment |

Nên sao lưu Google Sheet định kỳ và giới hạn quyền chỉnh sửa Sheet cho người vận hành.

## 15. Bảo mật và giới hạn hiện tại

Các điểm sau là mô tả trạng thái hiện tại, cần cân nhắc trước khi dùng cho dữ liệu thật hoặc triển khai diện rộng:

- Mật khẩu được lưu dạng rõ trong Google Sheet, chưa băm.
- Frontend lưu toàn bộ user object trong localStorage, không có JWT hoặc session server.
- Apps Script xác thực thao tác bằng `username` gửi từ client; không có token chứng minh phiên đăng nhập. Người biết username giáo viên có thể giả mạo request. Route guard phía React không phải ranh giới bảo mật.
- Action `recognize` chưa kiểm tra tài khoản ở Apps Script, dù route frontend yêu cầu đăng nhập.
- Các endpoint công khai không có rate limiting hoặc chống spam.
- URL ảnh do người dùng cung cấp được hiển thị trực tiếp; cần tin cậy host ảnh và lưu ý quyền riêng tư/vị trí trong metadata ảnh.
- Apps Script và Google Sheets có quota; không phù hợp tải lớn hoặc nhiều request đồng thời.
- Session của Species API có thể hết hạn và phải cập nhật thủ công.

Ưu tiên cải thiện: dùng backend xác thực thực sự (mật khẩu băm + session/JWT), kiểm tra token ở mọi mutation, giữ secret trong Script Properties/secret manager thay vì Sheet, thêm rate limit/audit log, và dùng dịch vụ upload ảnh có kiểm soát.

Nếu chuyển sang backend `api/`, cần lập kế hoạch migration dữ liệu và sửa `web/src/api.ts`; chỉ chạy Docker/PostgreSQL không tự động chuyển frontend sang NestJS.

## 16. Quy ước phát triển

- Thêm trang mới trong `web/src/pages/`, khai báo route và navigation tại `web/src/App.tsx`.
- Tập trung mọi lời gọi Apps Script tại `web/src/api.ts` để thống nhất xử lý lỗi/cache.
- Khi thêm action, cập nhật đồng thời `api.ts`, router trong `doPost()`, hàm xử lý, tài liệu API và test.
- Khi đổi schema Sheet, cập nhật constants header, `setup()`, các hàm parse/serialize và kế hoạch migration dữ liệu cũ.
- Không commit `.env`, API key, cookie phiên hoặc dữ liệu cá nhân.
- Chạy build và test trước khi deploy.

## 17. Tệp tham chiếu quan trọng

- `web/src/App.tsx`: routes, layout và kiểm soát quyền ở frontend.
- `web/src/api.ts`: hợp đồng dữ liệu giữa frontend và Apps Script.
- `web/src/auth.tsx`: mô hình phiên hiện tại.
- `google-apps-script/Code.gs`: nghiệp vụ server và schema Sheet.
- `web/src/pages/`: hành vi từng màn hình.
- `web/e2e/core.spec.ts`: phạm vi kiểm thử end-to-end hiện có.
- `web/.env.example`: biến frontend được hỗ trợ.

