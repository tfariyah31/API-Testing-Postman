const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

  try {
    
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token === authHeader) {
      return res.status(401).json({ message: 'Token missing from Authorization header' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();

  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};