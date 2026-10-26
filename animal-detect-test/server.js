import express from "express";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.static("public"));

app.post("/api/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Vui lòng upload ảnh.",
      });
    }

    const apiKey = process.env.ANIMAL_DETECT_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Thiếu ANIMAL_DETECT_API_KEY trong .env",
      });
    }

    const form = new FormData();

    const image = new Blob([req.file.buffer], {
      type: req.file.mimetype,
    });

    form.append("image", image, req.file.originalname);

    const response = await fetch("https://api.animaldetect.com/v1/detect", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "wildlife-api-test/1.0",
      },
      body: form,
    });

    const responseText = await response.text();

    res
      .status(response.status)
      .type("application/json")
      .send(
        responseText ||
          JSON.stringify({
            error: "Animal Detect trả về phản hồi rỗng.",
          }),
      );
  } catch (error) {
    console.error("Animal Detect error:", error.message);

    res.status(502).json({
      error: "Không thể kết nối Animal Detect API.",
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
