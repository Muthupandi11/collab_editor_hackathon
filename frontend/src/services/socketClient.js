import { io } from "socket.io-client";

/**
 * Creates a Socket.IO client instance.
 * @returns {import("socket.io-client").Socket}
 */
export function createSocketClient() {
	const backendUrl =
		import.meta.env.VITE_BACKEND_URL ||
		import.meta.env.VITE_SOCKET_URL ||
		"http://localhost:4000";

	return io(backendUrl, {
		timeout: 60000,
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 2000,
		reconnectionDelayMax: 5000,
		transports: ["websocket", "polling"],
		withCredentials: true,
		autoConnect: true
	});
}
