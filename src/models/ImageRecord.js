const mongoose = require("mongoose");

const imageRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    originalPath: { type: String, required: true },
    originalUrl: { type: String, required: true },
    renderPath: { type: String, required: true },
    renderUrl: { type: String, required: true },
    referenceValue: { type: Number, required: true },
    unit: { type: String, default: "cm" },
    summary: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImageRecord", imageRecordSchema);
