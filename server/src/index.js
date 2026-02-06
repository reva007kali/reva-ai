const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PORT } = require('./config');
const routes = require('./routes');
const path = require('path');
const { initSessionManager, getAllStatuses, shutdownAllSessions } = require('./services/sessionManager');
const { initScheduler } = require('./services/scheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for dev, tighten in prod
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Initialize Services
initScheduler();
initSessionManager(io);

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('Admin Panel connected');
  
  // Send current status of all sessions
  const sessions = getAllStatuses();
  socket.emit('all_sessions', sessions);
});

// Pass IO to routes if needed (e.g. for creating new sessions dynamically via API)
app.set('socketio', io);

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  try {
    await shutdownAllSessions();
    server.close(() => {
      console.log('HTTP Server closed.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
