// Supabase Edge bundler shim. Node's compiled output resolves database.js from
// database.ts; the Edge dependency graph follows this source shim to the TS file.
export * from "./database.ts";
