const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await Project.find({ createdBy: userId }).sort({
      createdAt: -1,
    });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res
      .status(500)
      .json({ message: "Error fetching projects", error: error.message });
  }
});


router.post("/create", authMiddleware, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Project name is required" });
  }

  const newProject = new Project({
    _id: new mongoose.Types.ObjectId(),
    name,
    description,
    createdBy: req.user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    const savedProject = await newProject.save();
    res.status(201).json({
      message: "Project created successfully",
      project: savedProject,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res
      .status(500)
      .json({ message: "Error creating project", error: error.message });
  }
});


router.get("/:id", authMiddleware, async (req, res) => {
  console.log("Fetching project with ID:", req.params.id);
  try {
    let project = await Project.findById(req.params.id);
    console.log("Project before population:", JSON.stringify(project, null, 2));

    project = await Project.findById(req.params.id).populate(
      "createdBy",
      "username"
    );
    console.log("Project after population:", JSON.stringify(project, null, 2));

    if (!project) {
      console.log("Project not found");
      return res.status(404).json({ message: "Project not found" });
    }

    if (
      typeof project.createdBy === "string" ||
      project.createdBy instanceof mongoose.Types.ObjectId
    ) {
      const user = await User.findById(project.createdBy);
      console.log("User found:", user);
      if (user) {
        project = project.toObject();
        project.createdBy = { _id: user._id, username: user.username };
      }
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project details:", error);
    res
      .status(500)
      .json({
        message: "Error fetching project details",
        error: error.message,
      });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    // Find the project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if the user is the creator of the project
    if (project.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You don't have permission to update this project" });
    }

    // Update the project
    project.name = name || project.name;
    project.description = description || project.description;
    project.updatedAt = new Date();

    const updatedProject = await project.save();

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
});

router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    console.log('Received request to add member:', req.body);
    const project = await Project.findById(req.params.id);
    if (!project) {
      console.log('Project not found:', req.params.id);
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      console.log('User not found:', req.body.username);
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (project.members.includes(user._id)) {
      console.log('User already a member:', user._id);
      return res.status(400).json({ message: 'User is already a member of this project' });
    }
    
    project.members.push(user._id);
    await project.save();
    
    await project.populate('createdBy', 'username');
    await project.populate('members', 'username');
    
    console.log('Updated project:', project);
    res.json(project);
  } catch (error) {
    console.error('Error adding member to project:', error);
    res.status(500).json({ message: 'Error adding member to project', error: error.message });
  }
});

module.exports = router;
