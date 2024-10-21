const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ["task", "bug"],
    default: "task",
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Stuck', 'Done'],
    default: 'Not Started'
  },
  priority: {
    type: String,
    enum: ["none", "low", "medium", "high", "critical"],
    default: "none",
  },
  timeline: {
    days: {
      type: Number,
      default: 0,
    },
    months: {
      type: Number,
      default: 0,
    },
  },
  assignedTo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  tasks: [TaskSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Project = mongoose.model("Project", ProjectSchema);
module.exports = Project;
