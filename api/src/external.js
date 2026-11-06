// Supabase Edge bundler shim. Node's compiled output resolves external.js from
// external.ts; the Edge dependency graph follows this source shim to the TS file.
export * from "./external.ts";
