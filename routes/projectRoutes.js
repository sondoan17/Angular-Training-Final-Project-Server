const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");

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
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('members', 'username');

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const populatedMembers = await Promise.all(project.members.map(async (member) => {
      if (typeof member === 'string' || member instanceof mongoose.Types.ObjectId) {
        const user = await User.findById(member).select('username');
        return user ? { _id: user._id, username: user.username } : { _id: member, username: 'Unknown' };
      }
      return member;
    }));

    const projectObject = project.toObject();
    projectObject.members = populatedMembers;

    res.json(projectObject);
  } catch (error) {
    console.error("Error fetching project details:", error);
    res.status(500).json({ message: "Error fetching project details", error: error.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    let project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You don't have permission to update this project" });
    }

    project.name = name || project.name;
    project.description = description || project.description;
    project.updatedAt = new Date();

    await project.save();

    project = await Project.findById(id).populate('createdBy', 'username');

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
});

router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (project.members.includes(user._id)) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }
    
    project.members.push(user._id);
    await project.save();
    
    project = await Project.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('members', 'username');
    
    const populatedMembers = await Promise.all(project.members.map(async (member) => {
      if (typeof member === 'string' || member instanceof mongoose.Types.ObjectId) {
        const user = await User.findById(member).select('username');
        return user ? { _id: user._id, username: user.username } : { _id: member, username: 'Unknown' };
      }
      return member;
    }));

    const projectObject = project.toObject();
    projectObject.members = populatedMembers;
    
    res.json(projectObject);
  } catch (error) {
    console.error('Error adding member to project:', error);
    res.status(500).json({ message: 'Error adding member to project', error: error.message });
  }
});

router.delete('/:projectId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    let project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if the user is the project creator
    if (project.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You don't have permission to remove members from this project" });
    }

    // Check if the member exists in the project
    if (!project.members.includes(memberId)) {
      return res.status(400).json({ message: 'User is not a member of this project' });
    }

    // Remove the member from the project
    project.members = project.members.filter(member => member.toString() !== memberId);
    await project.save();

    // Fetch the updated project with populated members
    project = await Project.findById(projectId)
      .populate('createdBy', 'username')
      .populate('members', 'username');

    const populatedMembers = await Promise.all(project.members.map(async (member) => {
      if (typeof member === 'string' || member instanceof mongoose.Types.ObjectId) {
        const user = await User.findById(member).select('username');
        return user ? { _id: user._id, username: user.username } : { _id: member, username: 'Unknown' };
      }
      return member;
    }));

    const projectObject = project.toObject();
    projectObject.members = populatedMembers;

    res.json(projectObject);
  } catch (error) {
    console.error('Error removing member from project:', error);
    res.status(500).json({ message: 'Error removing member from project', error: error.message });
  }
});

module.exports = router;
