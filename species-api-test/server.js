const express = require("express");
const multer = require("multer");

const app = express();
const PORT = 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

app.use(express.static("public"));
require("dotenv").config();

const sessionId = process.env.PHPSESSID;

if (!sessionId) {
  throw new Error("Missing PHPSESSID in .env");
}
app.post("/api/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Vui lòng chọn ảnh.",
      });
    }

    const formData = new FormData();
    formData.append("mode", "species");

    const imageBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype,
    });

    formData.append("image", imageBlob, req.file.originalname);

    const response = await fetch(
      "https://trituexanhhocduong.4devvn.com/api/identify-species.php",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          Cookie: `PHPSESSID=${sessionId}`,
          Referer:
            "https://trituexanhhocduong.4devvn.com/pages/species-identifier.php",
          Origin: "https://trituexanhhocduong.4devvn.com",
        },
        body: formData,
      },
    );

    const responseText = await response.text();

    console.log("Upstream status:", response.status);
    console.log("Upstream response:", responseText);

    res.status(response.ok ? 200 : 502).json({
      success: response.ok,
      upstreamStatus: response.status,
      result: responseText,
    });
  } catch (error) {
    console.error("Identification error:", error);

    res.status(500).json({
      error: "Không thể kết nối API nhận diện.",
      detail: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Local server: http://localhost:${PORT}`);
});
