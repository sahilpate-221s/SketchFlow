const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Diagram = require('./models/Diagram');
const User = require('./models/User');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
        socket.userId = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      socket.userId = user._id;
      socket.isGuest = false;
      socket.user = {
        id: user._id,
        email: user.email,
        role: user.role
      };
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      // Allow guest access even if token is invalid
      socket.isGuest = true;
      socket.userId = null;
      next();
    }
  });

  // Store active users in each diagram
  const activeUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, socket.isGuest ? 'as guest' : 'as user');

    let currentDiagramId = null;

    socket.on('joinDiagram', async ({ diagramId, user }) => {
      try {
        // Check if diagram exists
        const diagram = await Diagram.findById(diagramId);
        if (!diagram) {
          socket.emit('error', 'Diagram not found');
          return;
        }

        // Check access permissions
        const hasAccess = diagram.isPublic || 
          (socket.userId && (
            diagram.owner.toString() === socket.userId.toString() ||
            diagram.collaborators.some(c => c.user.toString() === socket.userId.toString())
          ));

        if (!hasAccess) {
          socket.emit('error', 'Access denied');
          return;
        }

        // Leave current diagram if any
        if (currentDiagramId) {
          socket.leave(currentDiagramId);
          const users = activeUsers.get(currentDiagramId);
          if (users) {
            users.delete(socket.id);
            if (users.size === 0) {
              activeUsers.delete(currentDiagramId);
            } else {
              socket.to(currentDiagramId).emit('collaboratorLeft', socket.id);
            }
          }
        }

        // Join the new diagram
        socket.join(diagramId);
        currentDiagramId = diagramId;

        // Add user to active users
        if (!activeUsers.has(diagramId)) {
          activeUsers.set(diagramId, new Map());
        }
        const users = activeUsers.get(diagramId);
        
        // Use provided user info or socket user info
        const userInfo = {
          userId: socket.userId || user?.id,
          isGuest: socket.isGuest,
          position: { x: 0, y: 0 },
          color: getRandomColor(),
          name: user?.name || socket.user?.email || 'Guest',
          role: user?.role || 'guest'
        };

        users.set(socket.id, userInfo);

        // Notify others about new user
        socket.to(diagramId).emit('collaboratorJoined', {
          id: socket.id,
          user: userInfo
        });

        // Send current state to new user
        socket.emit('diagramState', {
          shapes: diagram.canvas.shapes,
          stickyNotes: diagram.canvas.stickyNotes,
          markdown: diagram.canvas.markdown,
          users: Array.from(users.entries())
        });

        console.log(`User ${socket.id} joined diagram ${diagramId}`);
      } catch (error) {
        console.error('Error joining diagram:', error);
        socket.emit('error', 'Error joining diagram');
      }
    });

    socket.on('leaveDiagram', ({ diagramId }) => {
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

    // Shape events
    socket.on('shapeAdd', ({ diagramId, shape }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('shapeAdd', { shape });
      }
    });

    socket.on('shapeUpdate', ({ diagramId, shape }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('shapeUpdate', { shape });
      }
    });

    socket.on('shapeDelete', ({ diagramId, ids }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('shapeDelete', { ids });
      }
    });

    socket.on('viewUpdate', ({ diagramId, zoom, position }) => {
      if (currentDiagramId === diagramId) {
        socket.to(diagramId).emit('viewUpdate', { zoom, position });
      }
    });

    socket.on('cursorUpdate', ({ diagramId, position, selection, tool }) => {
      if (currentDiagramId === diagramId) {
        const users = activeUsers.get(diagramId);
        if (users && users.has(socket.id)) {
          const user = users.get(socket.id);
          user.position = position;
          socket.to(diagramId).emit('cursorUpdate', {
            id: socket.id,
            position,
            selection,
            tool,
            color: user.color,
            name: user.name
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
const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
    '#E67E22', '#2ECC71', '#F1C40F', '#1ABC9C'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

module.exports = initializeSocket; 