const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ["task", "bug"], required: true },
    status: {
      type: String,
      enum: ["not started", "in progress", "stuck", "done"],
      default: "not started",
    },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "critical"],
      default: "none",
    },
    timeline: {
      startDate: Date,
      endDate: Date,
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Issue", issueSchema);
