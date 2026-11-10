import { withSupabase, type SupabaseContext } from "@supabase/server";
import type { SupabaseClient } from "@supabase/server/peer/supabase-js";
import {
  chat,
  createSpeciesSession,
  recognize,
  SpeciesSessionInvalidError,
  uploadImage,
} from "./external.js";
import {
  loadConfig,
  pointsFor,
  profileForIdentity,
  throwIfError,
  type Profile,
} from "./database.js";

type Body = Record<string, any>;
type Context = SupabaseContext;
function runtimeEnv(name: string) {
  const deno = (globalThis as typeof globalThis & {
    Deno?: { env: { get(key: string): string | undefined } };
  }).Deno;
  return deno?.env.get(name) ?? process.env[name];
}
const ALLOWED_ORIGINS = new Set([
  "https://green-biology.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
type FetchHandler = (request: Request) => Promise<Response>;
function withAllowedCors(handler: FetchHandler): FetchHandler {
  return async (request) => {
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin))
      return Response.json({ ok: false, message: "Origin không được phép" }, { status: 403 });
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      Vary: "Origin",
    };
    if (origin) corsHeaders["Access-Control-Allow-Origin"] = origin;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    const response = await handler(request);
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
}
const PUBLIC_ACTIONS = new Set([
  "login",
  "register",
  "chat",
  "recognize",
  "listReports",
  "listChallenges",
  "listLeaderboard",
  "listProtectedAreas",
]);

function ok(data?: unknown) {
  return Response.json(data === undefined ? { ok: true } : { ok: true, data });
}
function text(value: unknown) {
  return String(value ?? "").trim();
}
function validUrl(value: unknown) {
  const url = text(value);
  if (!/^https?:\/\/[^\s]+$/i.test(url))
    throw new Error("Link ảnh không hợp lệ");
  return url;
}
function validateStatus(value: unknown) {
  if (value !== "APPROVED" && value !== "REJECTED")
    throw new Error("Trạng thái duyệt không hợp lệ");
  return value;
}

function stringList(value: unknown, field: string) {
  if (!Array.isArray(value)) throw new Error(`${field} không hợp lệ`);
  return value.map(text).filter(Boolean).slice(0, 100);
}

function protectedAreaValues(body: Body) {
  const name = text(body.name);
  const type = text(body.type);
  const establishedYear = Number(body.establishedYear);
  const areaHa = Number(body.areaHa);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (name.length < 3 || name.length > 160)
    throw new Error("Tên khu bảo tồn cần từ 3 đến 160 ký tự");
  if (type !== "National Park" && type !== "Nature Reserve")
    throw new Error("Loại khu bảo tồn không hợp lệ");
  if (!Number.isInteger(establishedYear) || establishedYear < 1800 || establishedYear > new Date().getFullYear())
    throw new Error("Năm thành lập không hợp lệ");
  if (!Number.isFinite(areaHa) || areaHa <= 0)
    throw new Error("Diện tích không hợp lệ");
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    throw new Error("Tọa độ không hợp lệ");
  const description = text(body.description);
  if (description.length < 20) throw new Error("Mô tả cần ít nhất 20 ký tự");
  const provinces = stringList(body.provinces, "Tỉnh/thành");
  if (!provinces.length) throw new Error("Cần ít nhất một tỉnh/thành");
  return {
    name,
    type,
    establishedYear,
    googleMapsUrl: validUrl(body.googleMapsUrl),
    mobileStreetViewUrl: text(body.mobileStreetViewUrl)
      ? validUrl(body.mobileStreetViewUrl)
      : null,
    provinces,
    latitude,
    longitude,
    areaHa,
    description,
    endemicSpecies: stringList(body.endemicSpecies, "Loài đặc hữu"),
    endangeredSpecies: stringList(body.endangeredSpecies, "Loài nguy cấp"),
    images: stringList(body.images, "Danh sách ảnh").map(validUrl),
  };
}

async function listProtectedAreas(ctx: Context) {
  const { data, error } = await ctx.supabaseAdmin
    .from("ProtectedAreas")
    .select("*")
    .order("name");
  throwIfError(error);
  return ok(data ?? []);
}

let speciesRefreshInFlight: Promise<string> | null = null;
async function refreshSpeciesSessionInDb(db: SupabaseClient) {
  if (speciesRefreshInFlight) return speciesRefreshInFlight;
  speciesRefreshInFlight = (async () => {
    const session = await createSpeciesSession(
      runtimeEnv("SPECIES_LOGIN_USERNAME"),
      runtimeEnv("SPECIES_LOGIN_PASSWORD"),
    );
    const { error } = await db
      .from("Config")
      .upsert({ key: "SPECIES_API_PHPSESSID", value: session }, { onConflict: "key" });
    throwIfError(error);
    return session;
  })().finally(() => {
    speciesRefreshInFlight = null;
  });
  return speciesRefreshInFlight;
}

async function recognizeWithSessionRecovery(body: Body, ctx: Context) {
  const config = await loadConfig(ctx.supabaseAdmin);
  try {
    return await recognize(body, config);
  } catch (error) {
    if (!(error instanceof SpeciesSessionInvalidError)) throw error;
    const session = await refreshSpeciesSessionInDb(ctx.supabaseAdmin);
    return recognize(body, { ...config, SPECIES_API_PHPSESSID: session });
  }
}
async function currentProfile(ctx: Context, teacher = false) {
  if (ctx.authMode !== "user" || !ctx.userClaims)
    throw new Error("Vui lòng đăng nhập");
  const username = String(
    ctx.userClaims.appMetadata?.username || "",
  ).toLowerCase();
  if (!username) throw new Error("Tài khoản chưa có hồ sơ ứng dụng");
  const profile = await profileForIdentity(ctx.supabaseAdmin, username);
  if (teacher && profile.role !== "TEACHER")
    throw new Error("Chỉ giáo viên được phép thực hiện thao tác này");
  return profile;
}

async function login(body: Body, ctx: Context) {
  if (ctx.authMode !== "publishable")
    throw new Error("Thông tin xác thực không hợp lệ");
  const username = text(body.username).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username))
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
  const email = `${username}@green-biology.local`;
  const password = String(body.pwd || "");
  const { data, error } = await ctx.supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session || !data.user)
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
  const profileUsername = String(
    data.user.app_metadata?.username || username,
  ).toLowerCase();
  const profile = await profileForIdentity(ctx.supabaseAdmin, profileUsername);
  return Response.json({
    ok: true,
    user: {
      ...profile,
      points: await pointsFor(ctx.supabaseAdmin, profile.username),
    },
    session: data.session,
  });
}

async function register(body: Body, ctx: Context) {
  if (ctx.authMode !== "publishable")
    throw new Error("Thông tin xác thực không hợp lệ");
  const username = text(body.username).toLowerCase();
  const pwd = String(body.pwd || "");
  const name = text(body.name);
  if (!/^[a-z0-9._-]{3,40}$/.test(username))
    throw new Error(
      "Tên đăng nhập cần 3–40 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới",
    );
  if (pwd.length < 6) throw new Error("Mật khẩu cần ít nhất 6 ký tự");
  if (name.length < 2 || name.length > 80)
    throw new Error("Họ tên cần từ 2 đến 80 ký tự");
  const email = `${username}@green-biology.local`;
  const { data: created, error: authError } =
    await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { username, role: "STUDENT" },
    });
  if (authError || !created.user) {
    if (/already|registered|exists/i.test(authError?.message || ""))
      throw new Error("Tên đăng nhập đã tồn tại");
    throw new Error(authError?.message || "Không thể tạo tài khoản");
  }
  const profile = { username, name, role: "STUDENT" };
  const { error } = await ctx.supabaseAdmin.from("Users").insert(profile);
  if (error) {
    await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id);
    if (error.code === "23505") throw new Error("Tên đăng nhập đã tồn tại");
    throw error;
  }
  const { data: signedIn, error: signInError } =
    await ctx.supabase.auth.signInWithPassword({ email, password: pwd });
  if (signInError || !signedIn.session)
    throw new Error("Đã tạo tài khoản nhưng không thể đăng nhập");
  return Response.json({
    ok: true,
    user: { id: username, username, name, role: "STUDENT", points: 0 },
    session: signedIn.session,
  });
}

async function createReport(body: Body, ctx: Context) {
  const user = await currentProfile(ctx);
  const urls = Array.isArray(body.imageUrls)
    ? body.imageUrls.map(validUrl)
    : [];
  if (!text(body.title) || text(body.description).length < 20)
    throw new Error("Báo cáo cần tiêu đề và mô tả ít nhất 20 ký tự");
  if (!urls.length || urls.length > 6)
    throw new Error("Cần từ 1 đến 6 link ảnh hợp lệ");
  const latitude = Number(body.latitude),
    longitude = Number(body.longitude);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error("Tọa độ không hợp lệ");
  const item = {
    id: crypto.randomUUID(),
    title: text(body.title),
    description: text(body.description),
    incidentType: text(body.incidentType) || "OTHER",
    latitude,
    longitude,
    imageUrls: urls,
    studentUsername: user.username,
    studentName: user.name,
    status: "PENDING",
  };
  const { data, error } = await ctx.supabaseAdmin
    .from("Reports")
    .insert(item)
    .select()
    .single();
  throwIfError(error);
  return ok(data);
}

async function listReports(ctx: Context) {
  let profile: Profile | null = null;
  if (ctx.authMode === "user") profile = await currentProfile(ctx);
  let query = ctx.supabaseAdmin
    .from("Reports")
    .select("*")
    .order("createdAt", { ascending: false });
  if (profile?.role !== "TEACHER")
    query = profile
      ? query.or(`status.eq.APPROVED,studentUsername.eq.${profile.username}`)
      : query.eq("status", "APPROVED");
  const { data, error } = await query;
  throwIfError(error);
  return ok(data ?? []);
}

async function listChallenges(ctx: Context) {
  const { data, error } = await ctx.supabaseAdmin
    .from("Challenges")
    .select("*")
    .eq("active", true)
    .order("endsAt");
  throwIfError(error);
  return ok(data ?? []);
}

function challengeValues(body: Body) {
  const title = text(body.title),
    description = text(body.description),
    points = Number(body.points),
    endsAt = text(body.endsAt);
  if (title.length < 3 || description.length < 10)
    throw new Error("Tên hoặc mô tả thử thách quá ngắn");
  if (!Number.isFinite(points) || points < 1 || points > 10000)
    throw new Error("Điểm thử thách không hợp lệ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsAt))
    throw new Error("Ngày kết thúc không hợp lệ");
  return {
    title,
    description,
    target: text(body.target),
    points,
    endsAt,
    proofInstructions: text(body.proofInstructions),
    active: body.active !== false,
  };
}

async function leaderboard(db: SupabaseClient) {
  const { data: users, error } = await db
    .from("Users")
    .select("username,name")
    .neq("role", "TEACHER");
  throwIfError(error);
  const items = await Promise.all(
    (users ?? []).map(async (user: any) => ({
      id: user.username,
      name: user.name || user.username,
      points: await pointsFor(db, user.username),
    })),
  );
  return ok(items.sort((a, b) => b.points - a.points));
}

async function dispatch(body: Body, ctx: Context) {
  const action = text(body.action);
  if (!PUBLIC_ACTIONS.has(action) && ctx.authMode !== "user")
    throw new Error("Vui lòng đăng nhập");
  if (action === "login") return login(body, ctx);
  if (action === "register") return register(body, ctx);
  if (action === "chat")
    return ok(await chat(body.question, await loadConfig(ctx.supabaseAdmin)));
  if (action === "recognize")
    return ok(await recognizeWithSessionRecovery(body, ctx));
  if (action === "uploadEvidenceImage") {
    await currentProfile(ctx);
    return ok(await uploadImage(body, await loadConfig(ctx.supabaseAdmin)));
  }
  if (action === "refreshSpeciesSession") {
    await currentProfile(ctx, true);
    const session = await createSpeciesSession(body.speciesUsername, body.speciesPassword);
    const { error } = await ctx.supabaseAdmin
      .from("Config")
      .upsert({ key: "SPECIES_API_PHPSESSID", value: session }, { onConflict: "key" });
    throwIfError(error);
    return ok({ updated: true });
  }
  if (action === "createReport") return createReport(body, ctx);
  if (action === "listReports") return listReports(ctx);
  if (action === "listProtectedAreas") return listProtectedAreas(ctx);
  if (action === "createProtectedArea") {
    await currentProfile(ctx, true);
    const { data, error } = await ctx.supabaseAdmin
      .from("ProtectedAreas")
      .insert({ id: crypto.randomUUID(), ...protectedAreaValues(body) })
      .select()
      .single();
    throwIfError(error);
    return ok(data);
  }
  if (action === "updateProtectedArea") {
    await currentProfile(ctx, true);
    const { data, error } = await ctx.supabaseAdmin
      .from("ProtectedAreas")
      .update({ ...protectedAreaValues(body), updatedAt: new Date().toISOString() })
      .eq("id", body.id)
      .select()
      .single();
    throwIfError(error);
    return ok(data);
  }
  if (action === "deleteProtectedArea") {
    await currentProfile(ctx, true);
    const { error } = await ctx.supabaseAdmin
      .from("ProtectedAreas")
      .delete()
      .eq("id", body.id);
    throwIfError(error);
    return ok();
  }
  if (action === "reviewReport") {
    const user = await currentProfile(ctx, true);
    const { error } = await ctx.supabaseAdmin
      .from("Reports")
      .update({
        status: validateStatus(body.status),
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.username,
      })
      .eq("id", body.id);
    throwIfError(error);
    return ok();
  }
  if (action === "listChallenges") return listChallenges(ctx);
  if (action === "createChallenge") {
    await currentProfile(ctx, true);
    const { data, error } = await ctx.supabaseAdmin
      .from("Challenges")
      .insert({ id: crypto.randomUUID(), ...challengeValues(body) })
      .select()
      .single();
    throwIfError(error);
    return ok(data);
  }
  if (action === "updateChallenge") {
    await currentProfile(ctx, true);
    const { data, error } = await ctx.supabaseAdmin
      .from("Challenges")
      .update(challengeValues(body))
      .eq("id", body.id)
      .select()
      .single();
    throwIfError(error);
    return ok(data);
  }
  if (action === "deleteChallenge") {
    await currentProfile(ctx, true);
    const { count } = await ctx.supabaseAdmin
      .from("ChallengeProofs")
      .select("id", { count: "exact", head: true })
      .eq("challengeId", body.id);
    if (count)
      throw new Error(
        "Không thể xóa thử thách đã có minh chứng. Hãy sửa ngày kết thúc hoặc trạng thái.",
      );
    const { error } = await ctx.supabaseAdmin
      .from("Challenges")
      .delete()
      .eq("id", body.id);
    throwIfError(error);
    return ok();
  }
  if (action === "submitChallengeProof") {
    const user = await currentProfile(ctx);
    const { data: challenge } = await ctx.supabaseAdmin
      .from("Challenges")
      .select("id")
      .eq("id", body.challengeId)
      .single();
    if (!challenge) throw new Error("Không tìm thấy thử thách");
    const { data, error } = await ctx.supabaseAdmin
      .from("ChallengeProofs")
      .insert({
        id: crypto.randomUUID(),
        challengeId: challenge.id,
        studentUsername: user.username,
        studentName: user.name,
        imageUrl: validUrl(body.imageUrl),
        note: text(body.note),
        status: "PENDING",
      })
      .select()
      .single();
    throwIfError(error);
    return ok(data);
  }
  if (action === "listChallengeProofs") {
    const user = await currentProfile(ctx);
    let query = ctx.supabaseAdmin
      .from("ChallengeProofs")
      .select("*")
      .order("createdAt", { ascending: false });
    if (user.role !== "TEACHER")
      query = query.eq("studentUsername", user.username);
    const { data, error } = await query;
    throwIfError(error);
    return ok(data ?? []);
  }
  if (action === "reviewChallengeProof") {
    const user = await currentProfile(ctx, true);
    const { error } = await ctx.supabaseAdmin
      .from("ChallengeProofs")
      .update({
        status: validateStatus(body.status),
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.username,
      })
      .eq("id", body.id);
    throwIfError(error);
    return ok();
  }
  if (action === "listLeaderboard") return leaderboard(ctx.supabaseAdmin);
  throw new Error("Thao tác không hợp lệ");
}

const apiCoreHandler = withSupabase(
  {
    auth: ["user", "publishable"],
    issuer: `${runtimeEnv("SUPABASE_URL")?.replace(/\/+$/, "")}/auth/v1`,
    cors: "disabled",
  },
  async (request, ctx) => {
    if (request.method === "GET")
      return Response.json({ ok: true, service: "Green Biology Supabase API" });
    if (request.method !== "POST")
      return Response.json(
        { ok: false, message: "Method not allowed" },
        { status: 405 },
      );
    let body: Body = {};
    try {
      body = await request.json();
      return await dispatch(body, ctx);
    } catch (error) {
      console.error("API action failed", { action: body.action, error });
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Không thể xử lý yêu cầu";
      return Response.json({ ok: false, message }, { status: 400 });
    }
  },
);
export const apiHandler = withAllowedCors(apiCoreHandler);

const publicSpeciesSessionCoreHandler = withSupabase(
  {
    auth: "none",
    cors: "disabled",
  },
  async (request, ctx) => {
    if (request.method !== "GET" && request.method !== "POST")
      return Response.json({ ok: false, message: "Method not allowed" }, { status: 405 });
    try {
      await refreshSpeciesSessionInDb(ctx.supabaseAdmin);
      return Response.json({
        ok: true,
        data: { updated: true, updatedAt: new Date().toISOString() },
      });
    } catch (error) {
        console.error("Public Species session refresh failed", error);
        return Response.json(
          {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Không thể làm mới Species session",
          },
          { status: 502 },
        );
    }
  },
);
export const publicSpeciesSessionHandler = withAllowedCors(
  publicSpeciesSessionCoreHandler,
);
