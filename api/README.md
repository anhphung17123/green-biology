# Green Biology Supabase API

Backend thay thế Google Apps Script, giữ nguyên action contract của `Code.gs` và lưu dữ liệu trong các bảng Supabase tương ứng.

## Thiết lập

1. Chạy migration `supabase/migrations/202611060001_google_sheets_schema.sql` bằng Supabase CLI hoặc SQL Editor.
2. Sao chép `.env.example` thành `.env` và điền `SUPABASE_SECRET_KEY` đầy đủ.
3. Điền các key `RIVER_API_KEY`, `RIVER_BASE_URL`, `SPECIES_API_URL`,
   `SPECIES_API_PHPSESSID`, `IMGBB_API_KEY` trong bảng `Config`.
4. Cài và chạy:

```bash
npm install
npm run dev
```

Endpoint mặc định là `http://localhost:3000`. Client phải gửi `apikey` với publishable key. Sau đăng nhập, các action riêng tư còn phải gửi `Authorization: Bearer <access_token>`.

## Tài khoản

- Mật khẩu được Supabase Auth quản lý và không tồn tại trong `public.Users`.
- `username` được backend ánh xạ thành email Auth nội bộ; người dùng vẫn đăng nhập bằng username và password trên giao diện.
- Để cấp quyền giáo viên, cập nhật `Users.role = 'TEACHER'` bằng SQL Editor/service backend.

## API actions

`login`, `register`, `chat`, `recognize`, `uploadEvidenceImage`, `refreshSpeciesSession`, `createReport`, `listReports`, `reviewReport`, `listChallenges`, `createChallenge`, `updateChallenge`, `deleteChallenge`, `submitChallengeProof`, `listChallengeProofs`, `reviewChallengeProof`, `listLeaderboard`.

`refreshSpeciesSession` chỉ cho role `TEACHER`. Request nhận `speciesUsername` và
`speciesPassword`, đăng nhập website nhận diện rồi cập nhật
`Config.SPECIES_API_PHPSESSID`; response không chứa cookie.

### Public cron endpoint

`GET` hoặc `POST /refresh-species-session` không yêu cầu API key hay JWT. Endpoint
đọc `SPECIES_LOGIN_USERNAME` và `SPECIES_LOGIN_PASSWORD` từ secret/environment, đăng
nhập website nhận diện và cập nhật `SPECIES_API_PHPSESSID`. Response không chứa
cookie hoặc thông tin đăng nhập. Các request đồng thời trong cùng process dùng
chung một lần refresh.
