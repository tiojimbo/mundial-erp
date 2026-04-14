import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('access_token');
    socket = io(
      (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/chat',
      {
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: false,
      },
    );
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    const token = localStorage.getItem('access_token');
    s.auth = { token };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
