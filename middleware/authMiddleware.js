const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    console.log('Auth headers:', req.headers.authorization);
    console.log('Request body:', req.body);
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decodedToken.userId };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
