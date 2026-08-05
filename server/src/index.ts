import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { env } from './config/env';
import { createRouter } from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { setupSocket } from './sockets/board.socket';

// Initialize Firebase (side effect import)
import './config/firebase';

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocket(io);

// Middleware
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', createRouter(io));

// Global error handler (must be last)
app.use(errorMiddleware);

// Start
const PORT = parseInt(env.PORT, 10);
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
});

export { app, io };
