/** @type {number | null} Interval ID for the keep-alive timer */
let keepAliveInterval = null;

/**
 * Start a keep-alive ping to prevent Render backend from cold-starting
 * Pings the /ping endpoint every 14 minutes
 * 
 * @param {string} backendUrl - Backend base URL.
 * @returns {Function} Cleanup function to stop the keep-alive
 */
export const startKeepAlive = (backendUrl) => {
	const url = backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

	// Ping immediately on startup
	pingBackend(url);

	// Then ping every 14 minutes (840000ms) to keep instance warm
	keepAliveInterval = setInterval(() => {
		pingBackend(url);
	}, 840000);

	// Return cleanup function
	return () => {
		if (keepAliveInterval) {
			clearInterval(keepAliveInterval);
			keepAliveInterval = null;
		}
	};
};

/**
 * Send a ping request to the backend
 * Logs only on errors to avoid console noise
 * 
 * @private
 */
const pingBackend = async (backendUrl) => {
	try {
		const response = await fetch(`${backendUrl}/ping`, {
			method: "GET",
			signal: AbortSignal.timeout(5000) // 5 second timeout
		});

		if (!response.ok) {
			console.warn(`Keep-alive ping failed with status ${response.status}`);
		}
	} catch (error) {
		// Silently fail - this is just a keep-alive mechanism
		// Don't spam console during development
	}
};

/**
 * Stop the keep-alive service manually
 * (Usually called via the cleanup function from startKeepAlive)
 */
export const stopKeepAlive = () => {
	if (keepAliveInterval) {
		clearInterval(keepAliveInterval);
		keepAliveInterval = null;
	}
};
