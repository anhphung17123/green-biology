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

`login`, `register`, `chat`, `recognize`, `uploadEvidenceImage`, `createReport`, `listReports`, `reviewReport`, `listChallenges`, `createChallenge`, `updateChallenge`, `deleteChallenge`, `submitChallengeProof`, `listChallengeProofs`, `reviewChallengeProof`, `listLeaderboard`.
