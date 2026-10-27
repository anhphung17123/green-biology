import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:5180" },
  webServer: [
    {
      command: "cd ../api && PORT=3010 npm start",
      url: "http://127.0.0.1:3010/api/games",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command:
        "VITE_API_URL=http://127.0.0.1:3010/api npm run dev -- --host 127.0.0.1 --port 5180",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
