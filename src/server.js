require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const imageRoutes = require("./routes/images");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ service: "visorsv-backend", status: "ok" });
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/renders", express.static(path.join(__dirname, "..", "renders")));

app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    fs.mkdirSync(path.join(__dirname, "..", "uploads"), { recursive: true });
    fs.mkdirSync(path.join(__dirname, "..", "renders"), { recursive: true });
    app.listen(PORT, () => console.log(`Backend escuchando en http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Error conectando a MongoDB:", e.message);
    process.exit(1);
  });

module.exports = app;
