import { io } from "socket.io-client";
import { getBackendBaseUrl } from "./backendUrl.js";

/**
 * Creates a Socket.IO client instance.
 * @returns {import("socket.io-client").Socket}
 */
export function createSocketClient() {
	const backendUrl = getBackendBaseUrl();

	return io(backendUrl, {
		timeout: 60000,
		reconnection: true,
		reconnectionAttempts: 15,
		reconnectionDelay: 2000,
		reconnectionDelayMax: 8000,
		transports: ["websocket", "polling"],
		withCredentials: true,
		autoConnect: true
	});
}
