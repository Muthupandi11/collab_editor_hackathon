import { io } from "socket.io-client";

/**
 * Creates a Socket.IO client instance.
 * @returns {import("socket.io-client").Socket}
 */
export function createSocketClient() {
	return io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
		transports: ["websocket", "polling"],
		withCredentials: true,
		autoConnect: true
	});
}
