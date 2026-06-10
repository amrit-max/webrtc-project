import { Server, Socket } from 'socket.io';
import { getRoom } from './rooms';

export const handleSignaling = (socket: Socket, io: Server) => {
  
  socket.on('offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('offer', { offer });
  });

  socket.on('answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  socket.on('remote-control', (data) => {
    const { roomId, ...eventData } = data;
    const room = getRoom(roomId);
    if (room && room.host) {
      io.to(room.host).emit('remote-control', eventData);
    }
  });

  socket.on('control-request', (roomId) => {
    const room = getRoom(roomId);
    if (room && room.host) {
      io.to(room.host).emit('control-request', { viewerId: socket.id });
    }
  });

  socket.on('control-approved', ({ roomId, viewerId }) => {
    if (viewerId) {
      io.to(viewerId).emit('control-approved');
    } else {
      socket.to(roomId).emit('control-approved');
    }
  });

};
