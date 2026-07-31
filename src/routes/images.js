const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const ImageRecord = require("../models/ImageRecord");
const { authRequired, adminRequired } = require("../middleware/auth");
const { processWithEngine, checkEngine } = require("../utils/engineClient");

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const RENDERS_DIR = path.join(__dirname, "..", "..", "renders");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(RENDERS_DIR, { recursive: true });

const ALLOWED = { ".png": true, ".jpg": true, ".jpeg": true, ".tif": true, ".tiff": true };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED[ext]) {
      return cb(new Error("Formato no soportado. Use PNG, JPG, JPEG o TIFF."));
    }
    cb(null, true);
  },
});

function toUrl(req, segment, filename) {
  return `${req.protocol}://${req.get("host")}/${segment}/${filename}`;
}

router.get("/engine/health", authRequired, async (req, res) => {
  try {
    res.json(await checkEngine());
  } catch (e) {
    res.status(503).json({ error: "Engine no disponible", detail: e.message });
  }
});

router.post("/", authRequired, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Se requiere el archivo de imagen" });
    }
    const reference = parseFloat(req.body.reference);
    const unit = req.body.unit || "cm";
    const mode = req.body.mode === "render" ? "render" : "plano";
    if (!reference || reference <= 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "reference debe ser un número mayor a 0" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const renderName = `${path.basename(req.file.filename, ext)}_${mode}_render.png`;
    const renderPath = path.join(RENDERS_DIR, renderName);

    const result = await processWithEngine(req.file.path, req.file.originalname, reference, unit, mode);

    const engineRenderUrl = result.render_url;
    const engineRenderPath = path.join(__dirname, "..", "..", "..", "engine", "renders", result.render_file);
    if (fs.existsSync(engineRenderPath)) {
      fs.copyFileSync(engineRenderPath, renderPath);
    }

    const record = await ImageRecord.create({
      user: req.user.id,
      originalName: req.file.originalname,
      originalPath: req.file.path,
      originalUrl: toUrl(req, "uploads", req.file.filename),
      renderPath,
      renderUrl: toUrl(req, "renders", renderName),
      referenceValue: reference,
      unit,
      mode,
      summary: result.summary,
    });

    res.status(201).json({
      id: record._id,
      originalUrl: record.originalUrl,
      renderUrl: record.renderUrl,
      referenceValue: record.referenceValue,
      unit: record.unit,
      mode: record.mode,
      summary: record.summary,
      engineRenderUrl,
    });
  } catch (e) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

router.get("/", authRequired, async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { user: req.user.id };
    const records = await ImageRecord.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const record = await ImageRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Registro no encontrado" });
    if (req.user.role !== "admin" && String(record.user) !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const record = await ImageRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: "Registro no encontrado" });
    for (const p of [record.originalPath, record.renderPath]) {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    }
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
