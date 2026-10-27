const USER_HEADERS = ["username", "pwd", "name", "role"];

function doGet() {
  return json_({ ok: true, service: "Green Biology Users" });
}

function doPost(event) {
  try {
    const body = JSON.parse(
      (event.postData && event.postData.contents) || "{}",
    );
    if (body.action === "register") return register_(body);
    if (body.action === "chat") return chat_(body);
    if (body.action === "recognize") return recognize_(body);
    if (body.action !== "login")
      return json_({ ok: false, message: "Thao tác không hợp lệ" });
    const username = String(body.username || "")
      .trim()
      .toLowerCase();
    const pwd = String(body.pwd || "");
    const user = users_().find(
      (item) =>
        String(item.username).trim().toLowerCase() === username &&
        String(item.pwd) === pwd,
    );
    if (!user)
      return json_({
        ok: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    return json_({
      ok: true,
      user: {
        id: username,
        name: user.name || user.username,
        username: user.username,
        role: user.role === "TEACHER" ? "TEACHER" : "STUDENT",
        points: 0,
      },
    });
  } catch (error) {
    return json_({
      ok: false,
      message: error.message || "Không thể đọc Google Sheets",
    });
  }
}

function register_(body) {
  const username = String(body.username || "")
    .trim()
    .toLowerCase();
  const pwd = String(body.pwd || "");
  const name = String(body.name || "").trim();
  if (!/^[a-z0-9._-]{3,40}$/.test(username))
    return json_({
      ok: false,
      message:
        "Tên đăng nhập cần 3–40 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới",
    });
  if (pwd.length < 6)
    return json_({ ok: false, message: "Mật khẩu cần ít nhất 6 ký tự" });
  if (name.length < 2 || name.length > 80)
    return json_({ ok: false, message: "Họ tên cần từ 2 đến 80 ký tự" });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (
      users_().some(
        (item) => String(item.username).trim().toLowerCase() === username,
      )
    )
      return json_({ ok: false, message: "Tên đăng nhập đã tồn tại" });
    const sheet = spreadsheet_().getSheetByName("Users");
    sheet.appendRow([username, pwd, name, "STUDENT"]);
  } finally {
    lock.releaseLock();
  }
  return json_({
    ok: true,
    user: { id: username, username, name, role: "STUDENT", points: 0 },
  });
}

function setup() {
  const book = spreadsheet_();
  let sheet = book.getSheetByName("Users");
  if (!sheet) sheet = book.insertSheet("Users");
  if (sheet.getLastRow() === 0) sheet.appendRow(USER_HEADERS);
  let config = book.getSheetByName("Config");
  if (!config) config = book.insertSheet("Config");
  if (config.getLastRow() === 0) {
    config.appendRow(["key", "value"]);
    config.appendRow(["RIVER_API_KEY", ""]);
    config.appendRow(["RIVER_BASE_URL", "https://api.river.ai/v1"]);
    config.appendRow([
      "SPECIES_API_URL",
      "https://trituexanhhocduong.4devvn.com/api/identify-species.php",
    ]);
    config.appendRow(["SPECIES_API_PHPSESSID", ""]);
  }
}

function chat_(body) {
  const question = String(body.question || "").trim();
  if (question.length < 3 || question.length > 1000)
    return json_({ ok: false, message: "Câu hỏi cần từ 3 đến 1000 ký tự" });
  const config = config_();
  if (!config.RIVER_API_KEY)
    return json_({
      ok: false,
      message: "Thiếu RIVER_API_KEY trong sheet Config",
    });
  const base = String(
    config.RIVER_BASE_URL || "https://api.river.ai/v1",
  ).replace(/\/+$/, "");
  const endpoint = base.endsWith("/v1")
    ? base + "/chat/completions"
    : base + "/v1/chat/completions";
  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + config.RIVER_API_KEY },
    payload: JSON.stringify({
      model: "deepseek-ai/DeepSeek-V4.1-Flash",
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "Bạn là chuyên gia giáo dục Sinh học THPT tại Việt Nam. Chỉ trả lời về sinh học, môi trường và bảo tồn bằng tiếng Việt.",
        },
        { role: "user", content: question },
      ],
    }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300)
    return json_({ ok: false, message: "River AI không thể trả lời lúc này" });
  const result = JSON.parse(response.getContentText());
  const answer =
    result.choices &&
    result.choices[0] &&
    result.choices[0].message &&
    result.choices[0].message.content;
  if (!answer)
    return json_({ ok: false, message: "River AI không trả về nội dung" });
  return json_({ ok: true, data: { answer: answer, sources: [] } });
}

function recognize_(body) {
  if (!body.image || !body.mimeType)
    return json_({ ok: false, message: "Thiếu ảnh cần nhận diện" });
  const config = config_();
  if (!config.SPECIES_API_PHPSESSID)
    return json_({
      ok: false,
      message: "Thiếu SPECIES_API_PHPSESSID trong sheet Config",
    });
  const endpoint =
    config.SPECIES_API_URL ||
    "https://trituexanhhocduong.4devvn.com/api/identify-species.php";
  const image = Utilities.newBlob(
    Utilities.base64Decode(body.image),
    body.mimeType,
    body.filename || "animal.jpg",
  );
  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    headers: {
      Cookie: "PHPSESSID=" + config.SPECIES_API_PHPSESSID,
      Accept: "application/json",
    },
    payload: { mode: "species", image: image },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300)
    return json_({ ok: false, message: "Species API không thể xử lý ảnh" });
  const result = JSON.parse(response.getContentText());
  if (!result || result.success !== true || !result.data)
    return json_({
      ok: false,
      message: "Species API trả về dữ liệu không hợp lệ",
    });
  return json_({ ok: true, data: result });
}

function config_() {
  const sheet = spreadsheet_().getSheetByName("Config");
  if (!sheet || sheet.getLastRow() < 2)
    throw new Error("Chưa có sheet Config. Hãy chạy setup().");
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 2)
    .getValues()
    .reduce((result, row) => {
      result[String(row[0]).trim()] = String(row[1]).trim();
      return result;
    }, {});
}

function users_() {
  const sheet = spreadsheet_().getSheetByName("Users");
  if (!sheet) throw new Error("Chưa có sheet Users. Hãy chạy setup() một lần.");
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, USER_HEADERS.length)
    .getValues()
    .map((values) => {
      const user = {};
      USER_HEADERS.forEach((header, index) => (user[header] = values[index]));
      return user;
    });
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("Thiếu Script Property SHEET_ID");
  return SpreadsheetApp.openById(id);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
