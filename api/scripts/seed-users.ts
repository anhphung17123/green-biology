import { readFile } from "node:fs/promises";
import { createAdminClient } from "@supabase/server/core";

type SeedUser = {
  username: string;
  password: string;
  name: string;
  role: "STUDENT" | "TEACHER";
};

const path = process.argv[2];
if (!path) throw new Error("Usage: npm run seed:users -- /path/to/users.json");
const raw = JSON.parse(await readFile(path, "utf8")) as Array<
  SeedUser | [string, string, string, SeedUser["role"]]
>;
const users: SeedUser[] = raw.map((item) =>
  Array.isArray(item)
    ? { username: item[0], password: item[1], name: item[2], role: item[3] }
    : item,
);
const admin = createAdminClient();
let created = 0;
let skipped = 0;
const failures: { username: string; message: string }[] = [];

for (const item of users) {
  const username = item.username.trim().toLowerCase();
  const existing = await admin
    .from("Users")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  if (existing.data) {
    skipped += 1;
    continue;
  }

  const email = `${username}@green-biology.local`;
  const auth = await admin.auth.admin.createUser({
    email,
    password: item.password,
    email_confirm: true,
    user_metadata: { name: item.name },
    app_metadata: { username, role: item.role },
  });
  const newlyCreated = !auth.error && Boolean(auth.data.user);
  let authUser = auth.data.user;
  if (auth.error || !authUser) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authUser = listed.data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (listed.error || !authUser) {
      failures.push({
        username,
        message:
          auth.error?.message ||
          listed.error?.message ||
          "Không thể tìm Auth user",
      });
      continue;
    }
  }

  const updated = await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { name: item.name },
    app_metadata: { username, role: item.role },
  });
  if (updated.error) {
    if (newlyCreated) await admin.auth.admin.deleteUser(authUser.id);
    failures.push({ username, message: updated.error.message });
    continue;
  }

  const profile = await admin.from("Users").insert({
    username,
    name: item.name,
    role: item.role,
  });
  if (profile.error) {
    if (newlyCreated) await admin.auth.admin.deleteUser(authUser.id);
    failures.push({ username, message: profile.error.message });
    continue;
  }
  created += 1;
}

console.log(
  JSON.stringify({ total: users.length, created, skipped, failures }, null, 2),
);
if (failures.length) process.exitCode = 1;
