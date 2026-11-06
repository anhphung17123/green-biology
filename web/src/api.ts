const SUPABASE_API_URL = import.meta.env.VITE_SUPABASE_API_URL?.trim();
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const SESSION_KEY = "green_supabase_session";
const RETRYABLE_ACTIONS = new Set([
  "listReports",
  "listChallenges",
  "listChallengeProofs",
  "listLeaderboard",
]);
const EXTERNAL_API_ACTIONS = new Set([
  "chat",
  "recognize",
  "uploadEvidenceImage",
]);

export class ApiError extends Error {}

const requestCache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = requestCache.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const request = loader().catch((error) => {
    requestCache.delete(key);
    throw error;
  });
  requestCache.set(key, request);
  return request;
}
function invalidate(prefix: string) {
  for (const key of requestCache.keys())
    if (key.startsWith(prefix)) requestCache.delete(key);
}

export async function loginWithSupabase<T>(
  username: string,
  pwd: string,
): Promise<T> {
  const result = await apiRequest({ action: "login", username, pwd }, false);
  saveSession(result.session);
  return result.user as T;
}

export async function registerWithSupabase<T>(
  username: string,
  pwd: string,
  name: string,
): Promise<T> {
  const result = await apiRequest(
    {
      action: "register",
      username,
      pwd,
      name,
    },
    false,
  );
  saveSession(result.session);
  return result.user as T;
}

export function clearSupabaseSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function askBiology<T>(question: string): Promise<T> {
  const result = await apiRequest({ action: "chat", question });
  return result.data as T;
}

export async function recognizeSpecies<T>(file: File): Promise<T> {
  const image = await fileToBase64(file);
  const result = await apiRequest({
    action: "recognize",
    image,
    filename: file.name,
    mimeType: file.type,
  });
  return result.data as T;
}
export async function uploadEvidenceImage(username: string, file: File) {
  const image = await fileToBase64(file);
  const result = await apiRequest({
    action: "uploadEvidenceImage",
    username,
    image,
    filename: file.name,
    mimeType: file.type,
  });
  return result.data as {
    url: string;
    displayUrl?: string;
    viewerUrl?: string;
  };
}

export async function refreshSpeciesSession(
  speciesUsername: string,
  speciesPassword: string,
) {
  await apiRequest({ action: "refreshSpeciesSession", speciesUsername, speciesPassword });
}

export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PollutionReport = {
  id: string;
  title: string;
  description: string;
  incidentType: string;
  latitude: number;
  longitude: number;
  imageUrls: string[];
  studentUsername: string;
  studentName: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};
export type GreenChallenge = {
  id: string;
  title: string;
  description: string;
  target: string;
  points: number;
  endsAt: string;
  proofInstructions: string;
  active: boolean;
};
export type ChallengeProof = {
  id: string;
  challengeId: string;
  studentUsername: string;
  studentName: string;
  imageUrl: string;
  note: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export async function createPollutionReport(
  payload: Omit<
    PollutionReport,
    "id" | "studentName" | "status" | "createdAt" | "reviewedAt" | "reviewedBy"
  >,
) {
  const result = await apiRequest({
    action: "createReport",
    ...payload,
    username: payload.studentUsername,
  });
  invalidate("reports:");
  return result.data as PollutionReport;
}
export function listPollutionReports(username?: string) {
  return cached(`reports:${username || "public"}`, async () => {
    const result = await apiRequest({
      action: "listReports",
      username: username || "",
    });
    return result.data as PollutionReport[];
  });
}
export async function reviewPollutionReport(
  username: string,
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  await apiRequest({ action: "reviewReport", username, id, status });
  invalidate("reports:");
}
export function listGreenChallenges() {
  return cached("challenges", async () => {
    const result = await apiRequest({ action: "listChallenges" });
    return result.data as GreenChallenge[];
  });
}
export async function createGreenChallenge(
  username: string,
  payload: Omit<GreenChallenge, "id">,
) {
  const result = await apiRequest({
    action: "createChallenge",
    username,
    ...payload,
  });
  invalidate("challenges");
  return result.data as GreenChallenge;
}
export async function updateGreenChallenge(
  username: string,
  payload: GreenChallenge,
) {
  const result = await apiRequest({
    action: "updateChallenge",
    username,
    ...payload,
  });
  invalidate("challenges");
  return result.data as GreenChallenge;
}
export async function deleteGreenChallenge(username: string, id: string) {
  await apiRequest({ action: "deleteChallenge", username, id });
  invalidate("challenges");
}
export async function submitChallengeProof(
  username: string,
  challengeId: string,
  imageUrl: string,
  note: string,
) {
  const result = await apiRequest({
    action: "submitChallengeProof",
    username,
    challengeId,
    imageUrl,
    note,
  });
  invalidate("proofs:");
  return result.data as ChallengeProof;
}
export function listChallengeProofs(username: string) {
  return cached(`proofs:${username}`, async () => {
    const result = await apiRequest({
      action: "listChallengeProofs",
      username,
    });
    return result.data as ChallengeProof[];
  });
}
export async function reviewChallengeProof(
  username: string,
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  await apiRequest({ action: "reviewChallengeProof", username, id, status });
  invalidate("proofs:");
  invalidate("leaderboard");
}
export function listLeaderboard() {
  return cached("leaderboard", async () => {
    const result = await apiRequest({ action: "listLeaderboard" });
    return result.data as { id: string; name: string; points: number }[];
  });
}

async function apiRequest(
  body: Record<string, unknown>,
  includeSession = true,
  authRetried = false,
): Promise<any> {
  if (!SUPABASE_API_URL) throw new ApiError("Thiếu VITE_SUPABASE_API_URL");
  if (!SUPABASE_PUBLISHABLE_KEY)
    throw new ApiError("Thiếu VITE_SUPABASE_PUBLISHABLE_KEY");
  const action = String(body.action || "");
  const attempts = RETRYABLE_ACTIONS.has(action) ? 3 : 1;
  const timeoutMs = EXTERNAL_API_ACTIONS.has(action) ? 60000 : 15000;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const session = includeSession ? await validSession() : null;
      const response = await fetch(SUPABASE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) return result;
      if (
        includeSession &&
        !authRetried &&
        result.code === "INVALID_JWT" &&
        readSession()?.refresh_token
      ) {
        await refreshStoredSession(true);
        return apiRequest(body, includeSession, true);
      }
      const retryableStatus = response.status === 429 || response.status >= 500;
      if (!retryableStatus || attempt === attempts - 1)
        throw new ApiError(result.message || "Yêu cầu không thể xử lý lúc này");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt === attempts - 1) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw new ApiError("Nơi lưu trữ phản hồi quá lâu. Vui lòng thử lại.");
        throw new ApiError("Không thể kết nối Supabase API");
      }
    } finally {
      window.clearTimeout(timeout);
    }
    await new Promise((resolve) =>
      window.setTimeout(resolve, 400 * 2 ** attempt + Math.random() * 250),
    );
  }
  throw new ApiError("Không thể kết nối Supabase API");
}

type StoredSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
};
let refreshInFlight: Promise<StoredSession> | null = null;
function saveSession(session: StoredSession | undefined) {
  if (!session?.access_token)
    throw new ApiError("Supabase không trả về phiên đăng nhập");
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function readSession(): StoredSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

async function validSession() {
  const session = readSession();
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || session.expires_at > now + 60) return session;
  return refreshStoredSession();
}

async function refreshStoredSession(force = false): Promise<StoredSession> {
  const current = readSession();
  if (!current?.refresh_token) return expireSession();
  const now = Math.floor(Date.now() / 1000);
  if (!force && current.expires_at && current.expires_at > now + 60)
    return current;
  if (refreshInFlight) return refreshInFlight;
  if (!SUPABASE_URL) throw new ApiError("Thiếu VITE_SUPABASE_URL");
  if (!SUPABASE_PUBLISHABLE_KEY)
    throw new ApiError("Thiếu VITE_SUPABASE_PUBLISHABLE_KEY");

  refreshInFlight = (async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ refresh_token: current.refresh_token }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.access_token) return expireSession();
      const next: StoredSession = {
        access_token: result.access_token,
        refresh_token: result.refresh_token || current.refresh_token,
        expires_at:
          result.expires_at ||
          Math.floor(Date.now() / 1000) + Number(result.expires_in || 3600),
      };
      saveSession(next);
      return next;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function expireSession(): never {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("green_user");
  window.dispatchEvent(new Event("green-auth-expired"));
  throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError("Không thể đọc ảnh"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}
