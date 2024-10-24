require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');


// Replace this with your actual MongoDB connection string
const databaseUrl = process.env.MONGODB_URI;

mongoose.connect(databaseUrl, { useNewUrlParser: true, useUnifiedTopology: true });

async function clearActivityLogs() {
  try {
    const result = await Project.updateMany(
      {},
      { $set: { "tasks.$[].activityLog": [] } }
    );

    console.log(`Updated ${result.modifiedCount} projects`);
    console.log('All activity logs have been cleared');
  } catch (error) {
    console.error('Error clearing activity logs:', error);
  } finally {
    mongoose.disconnect();
  }
}

clearActivityLogs();
