const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Diagram = require('./models/Diagram');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        // Allow guest access for public boards
        socket.isGuest = true;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.isGuest = false;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Store active users in each diagram
  const activeUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    let currentDiagramId = null;

    socket.on('joinDiagram', async ({ diagramId, user }) => {
      try {
        // Check if diagram exists and user has access
        const diagram = await Diagram.findById(diagramId);
        if (!diagram) {
          socket.emit('error', 'Diagram not found');
          return;
        }

        // Check if user has access (if diagram is private)
        if (!diagram.isPublic && socket.isGuest) {
          socket.emit('error', 'Access denied');
          return;
        }

        // Leave current diagram if any
        if (currentDiagramId) {
          socket.leave(currentDiagramId);
        }

        // Join the new diagram
        socket.join(diagramId);
        currentDiagramId = diagramId;

        // Add user to active users
        if (!activeUsers.has(diagramId)) {
          activeUsers.set(diagramId, new Map());
        }
        const users = activeUsers.get(diagramId);
        users.set(socket.id, {
          userId: socket.userId,
          isGuest: socket.isGuest,
          position: { x: 0, y: 0 },
          color: getRandomColor(),
          name: user?.username || (socket.isGuest ? 'Guest' : 'User'),
        });

        // Notify others about new user
        socket.to(diagramId).emit('collaboratorJoined', {
          id: socket.id,
          user: users.get(socket.id),
        });

        // Send current state to new user
        socket.emit('diagramState', {
          shapes: diagram.canvas.shapes,
          stickyNotes: diagram.canvas.stickyNotes,
          markdown: diagram.canvas.markdown,
          users: Array.from(users.entries()),
        });

        console.log(`User ${socket.id} joined diagram ${diagramId}`);
      } catch (error) {
        console.error('Error joining diagram:', error);
        socket.emit('error', 'Error joining diagram');
      }
    });

    socket.on('leaveDiagram', ({ diagramId, userId }) => {
      if (currentDiagramId === diagramId) {
        socket.leave(diagramId);
        currentDiagramId = null;

        // Remove user from active users
        const users = activeUsers.get(diagramId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            activeUsers.delete(diagramId);
          } else {
            socket.to(diagramId).emit('collaboratorLeft', socket.id);
          }
        }
      }
    });

    socket.on('shapeAdd', ({ diagramId, shape }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('shapeAdd', shape);
      }
    });

    socket.on('shapeUpdate', ({ diagramId, shape }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('shapeUpdate', shape);
      }
    });

    socket.on('shapeDelete', ({ diagramId, ids }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('shapeDelete', ids);
      }
    });

    socket.on('viewUpdate', ({ diagramId, zoom, position }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('viewUpdate', { zoom, position });
      }
    });

    socket.on('cursorUpdate', ({ diagramId, position }) => {
      if (currentDiagramId === diagramId) {
        const users = activeUsers.get(diagramId);
        if (users && users.has(socket.id)) {
          const user = users.get(socket.id);
          user.position = position;
          socket.to(diagramId).emit('cursorUpdate', {
            id: socket.id,
            position,
            color: user.color,
            name: user.name,
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove user from all active diagrams
      activeUsers.forEach((users, diagramId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          io.to(diagramId).emit('collaboratorLeft', socket.id);
          
          // Clean up empty diagrams
          if (users.size === 0) {
            activeUsers.delete(diagramId);
          }
        }
      });
    });
  });

  return io;
};

// Helper function to generate random colors for cursors
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = initializeSocket; 