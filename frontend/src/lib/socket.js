import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
// Nếu không có VITE_SOCKET_URL, socket.io sẽ tự dùng cùng domain/cổng với frontend (proxy hoặc production)
const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});

export default socket;
