import type { SupabaseClient } from "@supabase/server/peer/supabase-js";

export type Role = "STUDENT" | "TEACHER";
export type Profile = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

export type AppConfig = Record<string, string>;

export async function loadConfig(db: SupabaseClient): Promise<AppConfig> {
  const { data, error } = await db.from("Config").select("key,value");
  if (error) throw new Error(`Không thể đọc bảng Config: ${error.message}`);
  return Object.fromEntries(
    (data ?? []).map((row: any) => [
      String(row.key).trim(),
      String(row.value ?? "").trim(),
    ]),
  );
}

export async function profileForIdentity(
  db: SupabaseClient,
  username: string,
): Promise<Profile> {
  const { data, error } = await db
    .from("Users")
    .select("username,name,role")
    .eq("username", username)
    .single();
  if (error || !data) throw new Error("Tài khoản không hợp lệ");
  return { id: data.username, ...data } as Profile;
}

export async function pointsFor(db: SupabaseClient, username: string) {
  const { data: proofs, error: proofsError } = await db
    .from("ChallengeProofs")
    .select("challengeId")
    .eq("studentUsername", username)
    .eq("status", "APPROVED");
  if (proofsError) throw new Error(proofsError.message);
  const challengeIds = [
    ...new Set(
      (proofs ?? []).map((row: any) => row.challengeId).filter(Boolean),
    ),
  ];
  if (!challengeIds.length) return 0;

  // Keep this independent from PostgREST relationship discovery.
  const { data: challenges, error: challengesError } = await db
    .from("Challenges")
    .select("id,points")
    .in("id", challengeIds);
  if (challengesError) throw new Error(challengesError.message);
  const points = new Map(
    (challenges ?? []).map((row: any) => [
      String(row.id),
      Number(row.points) || 0,
    ]),
  );
  return (proofs ?? []).reduce(
    (sum: number, proof: any) =>
      sum + (points.get(String(proof.challengeId)) || 0),
    0,
  );
}

export function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
