import { withSupabase, type SupabaseContext } from "@supabase/server";
import type { SupabaseClient } from "@supabase/server/peer/supabase-js";
import { chat, createSpeciesSession, recognize, uploadImage } from "./external.js";
import {
  loadConfig,
  pointsFor,
  profileForIdentity,
  throwIfError,
  type Profile,
} from "./database.js";

type Body = Record<string, any>;
type Context = SupabaseContext;
const PUBLIC_ACTIONS = new Set([
  "login",
  "register",
  "chat",
  "recognize",
  "listReports",
  "listChallenges",
  "listLeaderboard",
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
    return ok(await recognize(body, await loadConfig(ctx.supabaseAdmin)));
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
      .insert(challengeValues(body))
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

export const apiHandler = withSupabase(
  {
    auth: ["user", "publishable"],
    issuer: `${process.env.SUPABASE_URL?.replace(/\/+$/, "")}/auth/v1`,
    cors: {
      headers: {
        "Access-Control-Allow-Origin":
          process.env.WEB_ORIGIN || "http://localhost:5173",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
    },
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

let speciesRefreshInFlight: Promise<Response> | null = null;

export const publicSpeciesSessionHandler = withSupabase(
  {
    auth: "none",
    cors: {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    },
  },
  async (request, ctx) => {
    if (request.method !== "GET" && request.method !== "POST")
      return Response.json({ ok: false, message: "Method not allowed" }, { status: 405 });
    if (speciesRefreshInFlight) return speciesRefreshInFlight;

    speciesRefreshInFlight = (async () => {
      try {
        const session = await createSpeciesSession(
          process.env.SPECIES_LOGIN_USERNAME,
          process.env.SPECIES_LOGIN_PASSWORD,
        );
        const { error } = await ctx.supabaseAdmin
          .from("Config")
          .upsert(
            { key: "SPECIES_API_PHPSESSID", value: session },
            { onConflict: "key" },
          );
        throwIfError(error);
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
      } finally {
        speciesRefreshInFlight = null;
      }
    })();
    return speciesRefreshInFlight;
  },
);
