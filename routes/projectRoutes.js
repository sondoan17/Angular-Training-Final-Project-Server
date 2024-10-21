const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { ObjectId } = mongoose.Types;

// Đặt route này ở đầu file
router.get("/assigned-tasks", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching tasks for user:', userId);

    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { members: userId },
        { 'tasks.assignedTo': userId }
      ]
    });

    console.log('Found projects:', projects.length);

    const assignedTasks = projects.flatMap(project => 
      project.tasks.filter(task => 
        Array.isArray(task.assignedTo) && task.assignedTo.some(assignee => assignee && assignee.toString() === userId)
      ).map(task => ({
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        projectId: project._id,
        projectName: project.name
      }))
    );

    console.log('Assigned tasks:', assignedTasks.length);

    res.json(assignedTasks);
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error fetching assigned tasks', error: error.message, stack: error.stack });
  }
});

// Các route khác giữ nguyên
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await Project.find({ createdBy: userId }).sort({
      createdAt: -1,
    });
    res.json(projects);
  } catch (error) {
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
    members: [req.user.userId], 
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
    res
      .status(500)
      .json({ message: "Error creating project", error: error.message });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "username")
      .populate("members", "username");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const populatedMembers = await Promise.all(
      project.members.map(async (member) => {
        if (
          typeof member === "string" ||
          member instanceof mongoose.Types.ObjectId
        ) {
          const user = await User.findById(member).select("username");
          return user
            ? { _id: user._id, username: user.username }
            : { _id: member, username: "Unknown" };
        }
        return member;
      })
    );

    const projectObject = project.toObject();
    projectObject.members = populatedMembers;

    res.json(projectObject);
  } catch (error) {
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
    let project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this project" });
    }

    project.name = name || project.name;
    project.description = description || project.description;
    project.updatedAt = new Date();

    await project.save();

    project = await Project.findById(id).populate("createdBy", "username");

    res.json(project);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating project", error: error.message });
  }
});

router.post("/:id/members", authMiddleware, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (project.members.includes(user._id)) {
      return res
        .status(400)
        .json({ message: "User is already a member of this project" });
    }

    project.members.push(user._id);
    await project.save();

    project = await Project.findById(req.params.id)
      .populate("createdBy", "username")
      .populate("members", "username");

    const populatedMembers = await Promise.all(
      project.members.map(async (member) => {
        if (
          typeof member === "string" ||
          member instanceof mongoose.Types.ObjectId
        ) {
          const user = await User.findById(member).select("username");
          return user
            ? { _id: user._id, username: user.username }
            : { _id: member, username: "Unknown" };
        }
        return member;
      })
    );

    const projectObject = project.toObject();
    projectObject.members = populatedMembers;

    res.json(projectObject);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error adding member to project",
        error: error.message,
      });
  }
});

router.delete(
  "/:projectId/members/:memberId",
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId, memberId } = req.params;

      let project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.createdBy.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({
            message:
              "You don't have permission to remove members from this project",
          });
      }

      if (!project.members.includes(memberId)) {
        return res
          .status(400)
          .json({ message: "User is not a member of this project" });
      }

      project.members = project.members.filter(
        (member) => member.toString() !== memberId
      );
      await project.save();

      project = await Project.findById(projectId)
        .populate("createdBy", "username")
        .populate("members", "username");

      const populatedMembers = await Promise.all(
        project.members.map(async (member) => {
          if (
            typeof member === "string" ||
            member instanceof mongoose.Types.ObjectId
          ) {
            const user = await User.findById(member).select("username");
            return user
              ? { _id: user._id, username: user.username }
              : { _id: member, username: "Unknown" };
          }
          return member;
        })
      );

      const projectObject = project.toObject();
      projectObject.members = populatedMembers;

      res.json(projectObject);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error removing member from project",
          error: error.message,
        });
    }
  }
);

router.post("/:projectId/tasks", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, assignedTo, timeline } = req.body;
    const userId = req.user.userId; 

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    
    const taskAssignedTo = assignedTo && assignedTo.length > 0 ? assignedTo : [userId];

    const newTask = {
      title,
      description,
      status,
      priority,
      assignedTo: taskAssignedTo,
      timeline,
      createdBy: userId
    };

    project.tasks.push(newTask);
    await project.save();

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: "Error creating task", error: error.message });
  }
});

router.put("/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { title, description, type, status, priority, timeline, assignedTo } =
      req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = project.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.type = type || task.type;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.timeline = timeline || task.timeline;
    task.assignedTo = assignedTo ? new ObjectId(assignedTo) : task.assignedTo;
    task.updatedAt = new Date();

    await project.save();

    res.json(task);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating task", error: error.message });
  }
});

router.delete("/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.tasks = project.tasks.filter(
      (task) => task._id.toString() !== taskId
    );
    await project.save();

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: error.message });
  }
});

router.get("/:projectId/tasks", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate(
      "tasks.assignedTo",
      "username"
    );
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project.tasks);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: error.message });
  }
});

router.get("/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findById(projectId).populate({
      path: "tasks.assignedTo",
      select: "username",
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = project.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const taskObject = task.toObject();

    res.json(taskObject);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching task", error: error.message });
  }
});

router.patch("/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Not Started', 'In Progress', 'Stuck', 'Done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = project.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.status = status;
    await project.save();

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: "Error updating task status", error: error.message });
  }
});


router.delete("/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findOne({ _id: projectId, createdBy: userId });

    if (!project) {
      return res.status(404).json({ message: "Project not found or you don't have permission to delete it" });
    }

    await Project.findByIdAndDelete(projectId);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Error deleting project", error: error.message });
  }
});

router.put("/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;
    const userId = req.user.userId;

    const project = await Project.findOne({ _id: projectId, createdBy: userId });

    if (!project) {
      return res.status(404).json({ message: "Project not found or you don't have permission to edit it" });
    }
    
    if (updates.tasks) {
      updates.tasks.forEach(task => {
        if (task.assignedTo && !Array.isArray(task.assignedTo)) {
          task.assignedTo = [task.assignedTo];
        }
      });
    }

    Object.assign(project, updates);
    await project.save();

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
});

module.exports = router;
