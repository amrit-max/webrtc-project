interface Room {
  id: string;
  host?: string; // Socket ID
  viewers: string[]; // Socket IDs
}

const rooms = new Map<string, Room>();

export const getRoom = (roomId: string): Room => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { id: roomId, viewers: [] });
  }
  return rooms.get(roomId)!;
};

export const removeRoom = (roomId: string) => {
  rooms.delete(roomId);
};

export const getRooms = () => rooms;
