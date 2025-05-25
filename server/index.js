const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const diagramRoutes = require('./routes/diagrams');
const { auth } = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Apply auth middleware to all routes
app.use(auth);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/diagrams', diagramRoutes);

// Protected route example
app.get('/api/protected', (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sketchflow')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  let currentDiagramId = null;

  socket.on('join-diagram', (diagramId) => {
    if (currentDiagramId) {
      socket.leave(currentDiagramId);
    }
    socket.join(diagramId);
    currentDiagramId = diagramId;
    console.log(`User ${socket.id} joined diagram ${diagramId}`);
  });

  socket.on('leave-diagram', (diagramId) => {
    socket.leave(diagramId);
    currentDiagramId = null;
    console.log(`User ${socket.id} left diagram ${diagramId}`);
  });

  socket.on('shape-add', (data) => {
    if (currentDiagramId) {
      socket.to(currentDiagramId).emit('shape-add', data);
    }
  });

  socket.on('shape-update', (data) => {
    if (currentDiagramId) {
      socket.to(currentDiagramId).emit('shape-update', data);
    }
  });

  socket.on('shape-delete', (data) => {
    if (currentDiagramId) {
      socket.to(currentDiagramId).emit('shape-delete', data);
    }
  });

  socket.on('view-update', (data) => {
    if (currentDiagramId) {
      socket.to(currentDiagramId).emit('view-update', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SketchFlow API' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 