const mongoose = require('mongoose');

const diagramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  canvas: {
    shapes: {
      type: Array,
      default: []
    },
    stickyNotes: {
      type: Array,
      default: []
    },
    markdown: {
      content: {
        type: String,
        default: ''
      },
      lastEdited: {
        type: Date,
        default: Date.now
      }
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer'
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastEditedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
diagramSchema.index({ owner: 1 });
diagramSchema.index({ 'collaborators.user': 1 });
diagramSchema.index({ isPublic: 1 });
diagramSchema.index({ lastEditedAt: -1 });

// Static method to find diagrams for a user (owned and shared)
diagramSchema.statics.findByUser = async function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId },
      { isPublic: true }
    ]
  })
  .sort({ lastEditedAt: -1 })
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email')
  .lean();
};

// Static method to find public diagrams
diagramSchema.statics.findPublic = async function() {
  return this.find({ isPublic: true })
    .sort({ lastEditedAt: -1 })
    .populate('owner', 'username email')
    .lean();
};

// Method to update last edited info
diagramSchema.methods.updateLastEdited = async function(userId) {
  this.lastEditedBy = userId;
  this.lastEditedAt = new Date();
  this.version += 1;
  return this.save();
};

// Method to add collaborator
diagramSchema.methods.addCollaborator = async function(userId, role = 'viewer') {
  if (!this.collaborators.some(c => c.user.toString() === userId.toString())) {
    this.collaborators.push({ user: userId, role });
    return this.save();
  }
  return this;
};

// Method to remove collaborator
diagramSchema.methods.removeCollaborator = async function(userId) {
  this.collaborators = this.collaborators.filter(
    c => c.user.toString() !== userId.toString()
  );
  return this.save();
};

const Diagram = mongoose.model('Diagram', diagramSchema);

module.exports = Diagram; 