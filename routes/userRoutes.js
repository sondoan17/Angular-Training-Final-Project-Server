const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/check/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.json(!!user);
  } catch (error) {
    res.status(500).json({ message: 'Error checking user existence', error: error.message });
  }
});

module.exports = router;
