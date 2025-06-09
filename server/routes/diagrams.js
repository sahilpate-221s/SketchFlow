const express = require('express');
const router = express.Router();
const Diagram = require('../models/Diagram');
const { auth } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Create a new diagram
router.post('/', auth, async (req, res) => {
  try {
    const diagram = new Diagram({
      title: req.body.title || 'Untitled Diagram',
      description: req.body.description,
      owner: req.user._id,
      canvas: req.body.canvas || { shapes: [], stickyNotes: [], markdown: { content: '' } },
      settings: req.body.settings,
    });

    await diagram.save();
    res.status(201).json(diagram);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all diagrams for the user (owned and shared)
router.get('/', auth, async (req, res) => {
  try {
    const diagrams = await Diagram.findByUser(req.user._id);
    res.json(diagrams);
  } catch (error) {
    console.error('Error deleting diagram:', error.stack || error);
    res.status(500).json({ error: error.message });
  }
});

// Get public diagrams
router.get('/public', async (req, res) => {
  try {
    const diagrams = await Diagram.findPublic();
    res.json(diagrams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific diagram
router.get('/:id', auth, validation.validateObjectId, async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    const shareToken = req.query.shareToken;

    // Defensive check for collaborators array
    const collaborators = Array.isArray(diagram.collaborators) ? diagram.collaborators : [];

    // Check if user has access or valid share token
    if (!diagram.isPublic && 
        diagram.owner.toString() !== req.user._id.toString() && 
        !collaborators.some(c => c.user.toString() === req.user._id.toString()) &&
        diagram.shareToken !== shareToken) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(diagram);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a diagram
router.patch('/:id', auth, validation.validateObjectId, async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // Check if user has edit access
    const isOwner = diagram.owner.toString() === req.user._id.toString();
    const isEditor = diagram.collaborators.some(
      c => c.user.toString() === req.user._id.toString() && c.role === 'editor'
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ error: 'Edit access denied' });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'canvas', 'settings', 'isPublic'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.assign(diagram, updates);
    await diagram.updateLastEdited(req.user._id);
    await diagram.save();

    res.json(diagram);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a diagram
router.delete('/:id', auth, validation.validateObjectId, async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    console.log(`Deleting diagram ${diagram._id} owned by ${diagram.owner} requested by user ${req.user._id}`);

    // Only owner can delete
    if (diagram.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Delete access denied' });
    }

    await diagram.deleteOne();
    res.json({ message: 'Diagram deleted' });
  } catch (error) {
    console.error('Error deleting diagram:', error.stack || error);
    res.status(500).json({ error: error.message });
  }
});

// Collaboration routes
router.post('/:id/collaborators', auth, validation.validateObjectId, async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // Only owner can add collaborators
    if (diagram.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId, role } = req.body;
    await diagram.addCollaborator(userId, role);
    res.json(diagram);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id/collaborators/:userId', auth, validation.validateObjectId, async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // Only owner can remove collaborators
    if (diagram.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await diagram.removeCollaborator(req.params.userId);
    res.json(diagram);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Share diagram (generate shareable link)
const crypto = require('crypto');

router.post('/:id/share', auth, validation.validateObjectId, async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // Only owner can change sharing settings
    if (diagram.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { isPublic } = req.body;
    diagram.isPublic = isPublic;

    // Generate share token if not exists
    if (!diagram.shareToken) {
      diagram.shareToken = crypto.randomBytes(16).toString('hex');
    }

    await diagram.save();

    res.json({
      diagram,
      shareableLink: isPublic ? `/diagram/${diagram._id}?shareToken=${diagram.shareToken}` : null,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 