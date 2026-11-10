import type { AppConfig } from "./database.js";
import { Buffer } from "node:buffer";

function required(config: AppConfig, name: string) {
  const value = config[name]?.trim();
  if (!value) throw new Error(`Chưa cấu hình ${name}`);
  return value;
}

async function jsonFetch(url: string, init: RequestInit, message: string) {
  const response = await fetch(url, init);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as any)?.error?.message || message);
  return result as any;
}

export class SpeciesSessionInvalidError extends Error {
  constructor() {
    super("Phiên đăng nhập Species API đã hết hạn");
    this.name = "SpeciesSessionInvalidError";
  }
}

function phpSession(response: Response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const combined = cookies.length ? cookies.join(",") : response.headers.get("set-cookie") || "";
  return combined.match(/(?:^|[,;]\s*)PHPSESSID=([^;,\s]+)/i)?.[1] || "";
}

export async function createSpeciesSession(usernameValue: unknown, passwordValue: unknown) {
  const username = String(usernameValue ?? "").trim();
  const password = String(passwordValue ?? "");
  if (!username || !password) throw new Error("Thiếu tài khoản hoặc mật khẩu Species API");

  const loginUrl = "https://trituexanhhocduong.4devvn.com/pages/login.php";
  const initial = await fetch(loginUrl, { redirect: "manual" });
  let session = phpSession(initial);
  if (!initial.ok || !session) throw new Error("Không thể khởi tạo phiên đăng nhập Species API");

  const form = new URLSearchParams({ username, password });
  const login = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `PHPSESSID=${session}`,
      Referer: loginUrl,
    },
    body: form,
    redirect: "manual",
  });
  session = phpSession(login) || session;
  const location = login.headers.get("location") || "";
  const redirectedAwayFromLogin = login.status >= 300 && login.status < 400 && !/login\.php/i.test(location);
  if (!redirectedAwayFromLogin)
    throw new Error("Đăng nhập Species API thất bại. Hãy kiểm tra tài khoản hoặc mật khẩu");

  const verifyUrl = new URL(location, loginUrl).toString();
  const verify = await fetch(verifyUrl, {
    headers: { Cookie: `PHPSESSID=${session}` },
    redirect: "manual",
  });
  if (verify.status >= 300 && verify.status < 400 && /login\.php/i.test(verify.headers.get("location") || ""))
    throw new Error("Species API không chấp nhận phiên đăng nhập");
  return session;
}

export async function chat(questionValue: unknown, config: AppConfig) {
  const question = String(questionValue ?? "").trim();
  if (question.length < 3 || question.length > 1000)
    throw new Error("Câu hỏi cần từ 3 đến 1000 ký tự");
  const base = (
    config.RIVER_BASE_URL || "https://api.river.ai/v1"
  ).replace(/\/+$/, "");
  const endpoint = base.endsWith("/v1")
    ? `${base}/chat/completions`
    : `${base}/v1/chat/completions`;
  const result = await jsonFetch(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${required(config, "RIVER_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V4.1-Flash",
        temperature: 0.3,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia giáo dục Sinh học THPT tại Việt Nam. Chỉ trả lời về sinh học, môi trường và bảo tồn bằng tiếng Việt.",
          },
          { role: "user", content: question },
        ],
      }),
    },
    "River AI không thể trả lời lúc này",
  );
  const answer = result?.choices?.[0]?.message?.content;
  if (!answer) throw new Error("River AI không trả về nội dung");
  return { answer, sources: [] };
}

export async function recognize(
  body: Record<string, unknown>,
  config: AppConfig,
) {
  if (!body.image || !body.mimeType) throw new Error("Thiếu ảnh cần nhận diện");
  const bytes = Buffer.from(String(body.image), "base64");
  const form = new FormData();
  form.set("mode", "species");
  form.set(
    "image",
    new Blob([bytes], { type: String(body.mimeType) }),
    String(body.filename || "animal.jpg"),
  );
  const endpoint =
    config.SPECIES_API_URL ||
    "https://trituexanhhocduong.4devvn.com/api/identify-species.php";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Cookie: `PHPSESSID=${required(config, "SPECIES_API_PHPSESSID")}`,
      Accept: "application/json",
    },
    body: form,
  });
  const result = await response.json().catch(() => ({})) as any;
  const remoteMessage = String(result?.error?.message || result?.message || "");
  const redirectedToLogin = response.redirected && /login\.php/i.test(response.url);
  if (
    response.status === 401 ||
    response.status === 403 ||
    redirectedToLogin ||
    /(?:session|phpSESSID|unauthori[sz]ed|đăng nhập|login).*(?:hết hạn|invalid|không hợp lệ|required|again)?/i.test(
      remoteMessage,
    )
  ) {
    throw new SpeciesSessionInvalidError();
  }
  if (!response.ok)
    throw new Error(remoteMessage || "Species API không thể xử lý ảnh");
  if (result?.success !== true || !result.data)
    throw new Error("Species API trả về dữ liệu không hợp lệ");
  return result;
}

export async function uploadImage(
  body: Record<string, unknown>,
  config: AppConfig,
) {
  const mimeType = String(body.mimeType || "").toLowerCase();
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)
  )
    throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc GIF");
  const image = String(body.image || "");
  if (!image || !/^[a-zA-Z0-9+/=\r\n]+$/.test(image))
    throw new Error("Dữ liệu ảnh không hợp lệ");
  if (image.length > (32 * 1024 * 1024 * 4) / 3 + 4)
    throw new Error("Ảnh không được vượt quá 32 MB");
  const form = new FormData();
  form.set("key", required(config, "IMGBB_API_KEY"));
  form.set("image", image);
  form.set(
    "name",
    String(body.filename || "evidence")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 80),
  );
  const result = await jsonFetch(
    "https://api.imgbb.com/1/upload",
    { method: "POST", body: form },
    "Không thể tải ảnh lên ImgBB",
  );
  if (!result?.success || !result?.data?.url)
    throw new Error("Không thể tải ảnh lên ImgBB");
  return {
    url: result.data.url,
    displayUrl: result.data.display_url,
    viewerUrl: result.data.url_viewer,
  };
}
