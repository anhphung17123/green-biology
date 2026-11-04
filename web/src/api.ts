const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL?.trim();
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

export async function loginWithGoogleSheet<T>(
  username: string,
  pwd: string,
): Promise<T> {
  const result = await scriptRequest({ action: "login", username, pwd });
  return result.user as T;
}

export async function registerWithGoogleSheet<T>(
  username: string,
  pwd: string,
  name: string,
): Promise<T> {
  const result = await scriptRequest({
    action: "register",
    username,
    pwd,
    name,
  });
  return result.user as T;
}

export async function askBiology<T>(question: string): Promise<T> {
  const result = await scriptRequest({ action: "chat", question });
  return result.data as T;
}

export async function recognizeSpecies<T>(file: File): Promise<T> {
  const image = await fileToBase64(file);
  const result = await scriptRequest({
    action: "recognize",
    image,
    filename: file.name,
    mimeType: file.type,
  });
  return result.data as T;
}
export async function uploadEvidenceImage(username: string, file: File) {
  const image = await fileToBase64(file);
  const result = await scriptRequest({
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
  const result = await scriptRequest({
    action: "createReport",
    ...payload,
    username: payload.studentUsername,
  });
  invalidate("reports:");
  return result.data as PollutionReport;
}
export function listPollutionReports(username?: string) {
  return cached(`reports:${username || "public"}`, async () => {
    const result = await scriptRequest({
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
  await scriptRequest({ action: "reviewReport", username, id, status });
  invalidate("reports:");
}
export function listGreenChallenges() {
  return cached("challenges", async () => {
    const result = await scriptRequest({ action: "listChallenges" });
    return result.data as GreenChallenge[];
  });
}
export async function createGreenChallenge(
  username: string,
  payload: Omit<GreenChallenge, "id">,
) {
  const result = await scriptRequest({
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
  const result = await scriptRequest({
    action: "updateChallenge",
    username,
    ...payload,
  });
  invalidate("challenges");
  return result.data as GreenChallenge;
}
export async function deleteGreenChallenge(username: string, id: string) {
  await scriptRequest({ action: "deleteChallenge", username, id });
  invalidate("challenges");
}
export async function submitChallengeProof(
  username: string,
  challengeId: string,
  imageUrl: string,
  note: string,
) {
  const result = await scriptRequest({
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
    const result = await scriptRequest({
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
  await scriptRequest({ action: "reviewChallengeProof", username, id, status });
  invalidate("proofs:");
  invalidate("leaderboard");
}
export function listLeaderboard() {
  return cached("leaderboard", async () => {
    const result = await scriptRequest({ action: "listLeaderboard" });
    return result.data as { id: string; name: string; points: number }[];
  });
}

async function scriptRequest(body: Record<string, unknown>): Promise<any> {
  if (!GOOGLE_SCRIPT_URL) throw new ApiError("Thiếu VITE_GOOGLE_SCRIPT_URL");
  const action = String(body.action || "");
  const attempts = RETRYABLE_ACTIONS.has(action) ? 3 : 1;
  const timeoutMs = EXTERNAL_API_ACTIONS.has(action) ? 60000 : 15000;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) return result;
      const retryableStatus = response.status === 429 || response.status >= 500;
      if (!retryableStatus || attempt === attempts - 1)
        throw new ApiError(result.message || "Yêu cầu không thể xử lý lúc này");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt === attempts - 1) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw new ApiError("Nơi lưu trữ phản hồi quá lâu. Vui lòng thử lại.");
        throw new ApiError("Không thể kết nối Nơi lưu trữ");
      }
    } finally {
      window.clearTimeout(timeout);
    }
    await new Promise((resolve) =>
      window.setTimeout(resolve, 400 * 2 ** attempt + Math.random() * 250),
    );
  }
  throw new ApiError("Không thể kết nối Nơi lưu trữ");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError("Không thể đọc ảnh"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}
