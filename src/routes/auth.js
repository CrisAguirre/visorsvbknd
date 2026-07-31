const express = require("express");
const User = require("../models/User");
const { signToken } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email y password son requeridos" });
    }
    if (role && !["admin", "usuario"].includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: "El usuario o email ya existe" });
    }
    const user = await User.create({ username, email, password, role: role || "usuario" });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username y password son requeridos" });
    }
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
