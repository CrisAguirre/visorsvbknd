const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const ENGINE_URL = process.env.ENGINE_URL || "http://127.0.0.1:8000";

async function checkEngine() {
  const res = await axios.get(`${ENGINE_URL}/health`);
  return res.data;
}

async function processWithEngine(filePath, originalName, reference, unit) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), originalName);
  form.append("reference", String(reference));
  form.append("unit", unit);
  const res = await axios.post(`${ENGINE_URL}/process`, form, {
    headers: form.getHeaders(),
    timeout: 60000,
  });
  return res.data;
}

module.exports = { checkEngine, processWithEngine, ENGINE_URL };
