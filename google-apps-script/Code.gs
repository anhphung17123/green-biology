const USER_HEADERS = ["username", "pwd", "name", "role"];
const REPORT_HEADERS = ["id", "title", "description", "incidentType", "latitude", "longitude", "imageUrls", "studentUsername", "studentName", "status", "createdAt", "reviewedAt", "reviewedBy"];
const CHALLENGE_HEADERS = ["id", "title", "description", "target", "points", "endsAt", "proofInstructions", "active"];
const PROOF_HEADERS = ["id", "challengeId", "studentUsername", "studentName", "imageUrl", "note", "status", "createdAt", "reviewedAt", "reviewedBy"];

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
    if (body.action === "createReport") return createReport_(body);
    if (body.action === "listReports") return listReports_(body);
    if (body.action === "reviewReport") return reviewReport_(body);
    if (body.action === "listChallenges") return listChallenges_(body);
    if (body.action === "createChallenge") return createChallenge_(body);
    if (body.action === "updateChallenge") return updateChallenge_(body);
    if (body.action === "deleteChallenge") return deleteChallenge_(body);
    if (body.action === "submitChallengeProof") return submitChallengeProof_(body);
    if (body.action === "listChallengeProofs") return listChallengeProofs_(body);
    if (body.action === "reviewChallengeProof") return reviewChallengeProof_(body);
    if (body.action === "listLeaderboard") return listLeaderboard_();
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
        points: pointsFor_(username),
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
  ensureSheet_(book, "Reports", REPORT_HEADERS);
  const challenges = ensureSheet_(book, "Challenges", CHALLENGE_HEADERS);
  ensureSheet_(book, "ChallengeProofs", PROOF_HEADERS);
  if (challenges.getLastRow() === 1) {
    challenges.getRange(2, 1, 5, CHALLENGE_HEADERS.length).setValues([
      ["walk-1000", "Đi bộ 1.000 bước", "Đi bộ ít nhất 1.000 bước trong ngày.", "1000 bước", 10, "2027-12-31", "Gửi link ảnh chụp màn hình số bước.", true],
      ["cycle-5km", "Đạp xe 5 km", "Đạp xe quãng đường tối thiểu 5 km.", "5 km", 20, "2027-12-31", "Gửi link ảnh hành trình hoặc đồng hồ đo.", true],
      ["collect-waste", "Thu nhặt rác", "Thu nhặt và phân loại rác tại khu vực sinh sống.", "1 hoạt động", 15, "2027-12-31", "Gửi link ảnh trước và sau hoạt động.", true],
      ["collect-bottles", "Thu gom chai nhựa", "Thu gom vỏ chai nhựa rỗng để tái chế.", "10 chai", 15, "2027-12-31", "Gửi link ảnh số chai đã thu gom.", true],
      ["plant-tree", "Trồng một cây xanh", "Trồng và chăm sóc một cây phù hợp.", "1 cây", 25, "2027-12-31", "Gửi link ảnh cây đã trồng.", true],
    ]);
  }
}

function createReport_(body) {
  const user = requireUser_(body.username);
  const urls = Array.isArray(body.imageUrls) ? body.imageUrls.map(validUrl_) : [];
  if (!String(body.title || "").trim() || String(body.description || "").trim().length < 20)
    return json_({ ok: false, message: "Báo cáo cần tiêu đề và mô tả ít nhất 20 ký tự" });
  if (!urls.length || urls.length > 6)
    return json_({ ok: false, message: "Cần từ 1 đến 6 link ảnh hợp lệ" });
  const lat = Number(body.latitude), lng = Number(body.longitude);
  if (!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lng) || lng < -180 || lng > 180)
    return json_({ ok: false, message: "Tọa độ không hợp lệ" });
  const item = [Utilities.getUuid(), String(body.title).trim(), String(body.description).trim(), String(body.incidentType || "OTHER"), lat, lng, JSON.stringify(urls), user.username, user.name || user.username, "PENDING", new Date().toISOString(), "", ""];
  spreadsheet_().getSheetByName("Reports").appendRow(item);
  return json_({ ok: true, data: objectFromRow_(REPORT_HEADERS, item) });
}

function listReports_(body) {
  const user = findUser_(body.username);
  let items = rows_("Reports", REPORT_HEADERS);
  if (!user || user.role !== "TEACHER") items = items.filter(function (item) { return item.status === "APPROVED" || (user && item.studentUsername === user.username); });
  return json_({ ok: true, data: items.map(parseReport_) });
}

function reviewReport_(body) {
  const teacher = requireTeacher_(body.username);
  const status = String(body.status) === "APPROVED" ? "APPROVED" : String(body.status) === "REJECTED" ? "REJECTED" : "";
  if (!status) return json_({ ok: false, message: "Trạng thái duyệt không hợp lệ" });
  updateRow_("Reports", REPORT_HEADERS, body.id, { status: status, reviewedAt: new Date().toISOString(), reviewedBy: teacher.username });
  return json_({ ok: true });
}

function listChallenges_() {
  return json_({ ok: true, data: rows_("Challenges", CHALLENGE_HEADERS).filter(function (item) { return String(item.active).toLowerCase() !== "false"; }) });
}

function createChallenge_(body) {
  requireTeacher_(body.username);
  const item = challengeRow_(body, Utilities.getUuid());
  spreadsheet_().getSheetByName("Challenges").appendRow(item);
  return json_({ ok: true, data: objectFromRow_(CHALLENGE_HEADERS, item) });
}

function updateChallenge_(body) {
  requireTeacher_(body.username);
  const item = challengeRow_(body, String(body.id || ""));
  const changes = objectFromRow_(CHALLENGE_HEADERS, item);
  delete changes.id;
  updateRow_("Challenges", CHALLENGE_HEADERS, body.id, changes);
  return json_({ ok: true, data: objectFromRow_(CHALLENGE_HEADERS, item) });
}

function deleteChallenge_(body) {
  requireTeacher_(body.username);
  const used = rows_("ChallengeProofs", PROOF_HEADERS).some(function (proof) { return proof.challengeId === body.id; });
  if (used) return json_({ ok: false, message: "Không thể xóa thử thách đã có minh chứng. Hãy sửa ngày kết thúc hoặc trạng thái." });
  deleteRow_("Challenges", body.id);
  return json_({ ok: true });
}

function challengeRow_(body, id) {
  const title = String(body.title || "").trim(), description = String(body.description || "").trim();
  const points = Number(body.points), endsAt = String(body.endsAt || "").trim();
  if (title.length < 3 || description.length < 10) throw new Error("Tên hoặc mô tả thử thách quá ngắn");
  if (!isFinite(points) || points < 1 || points > 10000) throw new Error("Điểm thử thách không hợp lệ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsAt)) throw new Error("Ngày kết thúc không hợp lệ");
  return [id, title, description, String(body.target || "").trim(), points, endsAt, String(body.proofInstructions || "").trim(), body.active !== false];
}

function submitChallengeProof_(body) {
  const user = requireUser_(body.username);
  const challenge = rows_("Challenges", CHALLENGE_HEADERS).find(function (item) { return item.id === body.challengeId; });
  if (!challenge) return json_({ ok: false, message: "Không tìm thấy thử thách" });
  const imageUrl = validUrl_(body.imageUrl);
  const item = [Utilities.getUuid(), challenge.id, user.username, user.name || user.username, imageUrl, String(body.note || "").trim(), "PENDING", new Date().toISOString(), "", ""];
  spreadsheet_().getSheetByName("ChallengeProofs").appendRow(item);
  return json_({ ok: true, data: objectFromRow_(PROOF_HEADERS, item) });
}

function listChallengeProofs_(body) {
  const user = requireUser_(body.username);
  let items = rows_("ChallengeProofs", PROOF_HEADERS);
  if (user.role !== "TEACHER") items = items.filter(function (item) { return item.studentUsername === user.username; });
  return json_({ ok: true, data: items });
}

function reviewChallengeProof_(body) {
  const teacher = requireTeacher_(body.username);
  const status = String(body.status) === "APPROVED" ? "APPROVED" : String(body.status) === "REJECTED" ? "REJECTED" : "";
  if (!status) return json_({ ok: false, message: "Trạng thái duyệt không hợp lệ" });
  updateRow_("ChallengeProofs", PROOF_HEADERS, body.id, { status: status, reviewedAt: new Date().toISOString(), reviewedBy: teacher.username });
  return json_({ ok: true });
}

function listLeaderboard_() {
  const items = users_().filter(function (user) { return user.role !== "TEACHER"; }).map(function (user) {
    return { id: user.username, name: user.name || user.username, points: pointsFor_(user.username) };
  }).sort(function (a, b) { return b.points - a.points; });
  return json_({ ok: true, data: items });
}

function pointsFor_(username) {
  const book = spreadsheet_();
  if (!book.getSheetByName("ChallengeProofs") || !book.getSheetByName("Challenges")) return 0;
  const points = {};
  rows_("Challenges", CHALLENGE_HEADERS).forEach(function (item) { points[item.id] = Number(item.points) || 0; });
  return rows_("ChallengeProofs", PROOF_HEADERS).filter(function (proof) {
    return proof.studentUsername === username && proof.status === "APPROVED";
  }).reduce(function (total, proof) { return total + (points[proof.challengeId] || 0); }, 0);
}

function ensureSheet_(book, name, headers) {
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}
function rows_(name, headers) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("Chưa có sheet " + name + ". Hãy chạy setup().");
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (row) { return objectFromRow_(headers, row); });
}
function objectFromRow_(headers, row) { const item = {}; headers.forEach(function (header, index) { item[header] = row[index]; }); return item; }
function parseReport_(item) { try { item.imageUrls = JSON.parse(item.imageUrls || "[]"); } catch (_) { item.imageUrls = []; } return item; }
function findUser_(username) { const key = String(username || "").trim().toLowerCase(); return users_().find(function (item) { return String(item.username).trim().toLowerCase() === key; }); }
function requireUser_(username) { const user = findUser_(username); if (!user) throw new Error("Tài khoản không hợp lệ"); return user; }
function requireTeacher_(username) { const user = requireUser_(username); if (user.role !== "TEACHER") throw new Error("Chỉ giáo viên được phép duyệt"); return user; }
function validUrl_(value) { const url = String(value || "").trim(); if (!/^https?:\/\/[^\s]+$/i.test(url)) throw new Error("Link ảnh không hợp lệ"); return url; }
function updateRow_(name, headers, id, changes) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) throw new Error("Không tìm thấy dữ liệu");
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const index = values.findIndex(function (row) { return String(row[0]) === String(id); });
  if (index < 0) throw new Error("Không tìm thấy dữ liệu");
  Object.keys(changes).forEach(function (key) { const column = headers.indexOf(key); if (column >= 0) values[index][column] = changes[key]; });
  sheet.getRange(index + 2, 1, 1, headers.length).setValues([values[index]]);
}
function deleteRow_(name, id) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) throw new Error("Không tìm thấy dữ liệu");
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const index = ids.findIndex(function (row) { return String(row[0]) === String(id); });
  if (index < 0) throw new Error("Không tìm thấy dữ liệu");
  sheet.deleteRow(index + 2);
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
