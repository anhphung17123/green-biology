import { test, expect } from "@playwright/test";

test("opens the external interactive games", async ({ page }) => {
  await page.goto("/games");
  await expect(page.getByRole("link", { name: /Khám phá môi trường sống/ })).toHaveAttribute("href", "https://share.gemini.google/mtzBY4NhrNBz");
});

test("teacher route is protected by role", async ({ page }) => {
  await page.goto("/teacher");
  await expect(page).toHaveURL(/\/login$/);
});

test("registration form is available", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Chưa có tài khoản/ }).click();
  await expect(page.getByRole("heading", { name: "Tạo tài khoản" })).toBeVisible();
  await expect(page.getByLabel("Họ và tên")).toBeVisible();
  await expect(page.getByLabel("Nhập lại mật khẩu")).toBeVisible();
});

test("direct AQI failure never shows invented values", async ({ page }) => {
  await page.route("**/air-quality-api.open-meteo.com/**", route => route.abort());
  await page.goto("/air-quality");
  await expect(page.getByText(/Không thể tải dữ liệu AQI/)).toBeVisible();
});

test("chat and recognition remain available", async ({ page }) => {
  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "Hỏi điều bạn tò mò" })).toBeVisible();
  await page.goto("/recognition");
  await expect(page).toHaveURL(/\/login$/);
});
