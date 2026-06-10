import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getRoom, removeRoom } from './rooms';
import { handleSignaling } from './signaling';

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (roomId: string, role: 'host' | 'viewer') => {
    socket.join(roomId);
    const room = getRoom(roomId);
    
    // Store roomId and role in socket to easily clean up on disconnect
    socket.data.roomId = roomId;
    socket.data.role = role;

    if (role === 'host') {
      room.host = socket.id;
      console.log(`Host ${socket.id} joined room ${roomId}`);
      // Notify host of already joined viewers
      room.viewers.forEach(viewerId => {
        io.to(socket.id).emit('viewer-joined', { viewerId });
      });
    } else {
      room.viewers.push(socket.id);
      console.log(`Viewer ${socket.id} joined room ${roomId}`);
      // Notify host that a viewer joined
      if (room.host) {
        io.to(room.host).emit('viewer-joined', { viewerId: socket.id });
      }
    }
  });

  socket.on('leave-room', (roomId: string) => {
    handleDisconnect(socket);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    handleDisconnect(socket);
  });

  socket.on('ping-measure', (cb) => {
    if (typeof cb === 'function') cb();
  });

  socket.on('host-ready', (roomId: string) => {
    const room = getRoom(roomId);
    if (room && room.host === socket.id) {
      room.viewers.forEach(viewerId => {
        io.to(socket.id).emit('viewer-joined', { viewerId });
      });
    }
  });

  // Handle signaling and custom events
  handleSignaling(socket, io);
});

function handleDisconnect(socket: Socket) {
  const roomId = socket.data.roomId;
  const role = socket.data.role;

  if (roomId) {
    socket.leave(roomId);
    const room = getRoom(roomId);

    if (role === 'host') {
      room.host = undefined;
      socket.to(roomId).emit('host-disconnected');
      // optionally remove room
      removeRoom(roomId);
    } else if (role === 'viewer') {
      room.viewers = room.viewers.filter((id) => id !== socket.id);
      if (room.host) {
        io.to(room.host).emit('viewer-disconnected', { viewerId: socket.id });
      }
    }
    
    // Clean up empty rooms
    if (!room.host && room.viewers.length === 0) {
      removeRoom(roomId);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Backend signaling server running on port ${PORT}`);
});
