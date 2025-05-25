const mongoose = require('mongoose');

// Middleware to validate ObjectId params
function validateObjectId(req, res, next) {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  next();
}

module.exports = {
  validateObjectId,
};
