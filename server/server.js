const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    fileName: req.file.filename,
    originalName: req.file.originalname,
  });
});

app.use("/uploads", express.static(uploadDir));
app.post("/delete-files", (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: "No files provided" });
  }

  files.forEach(file => {
    try {
      const filePath = path.join(__dirname, "uploads", file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  });

  res.json({ success: true });
});
const dataFilePath = path.join(__dirname, "data.json");

// GET всички данни
app.get("/data", (req, res) => {
  try {
    const rawData = fs.readFileSync(dataFilePath);
    const data = JSON.parse(rawData);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read data file" });
  }
});

// POST записва всички данни
app.post("/data", (req, res) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to write data file" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
