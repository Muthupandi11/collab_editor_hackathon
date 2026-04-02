/**
 * Normalizes backend base URL from env values.
 * Handles missing protocol values from deployment dashboards.
 * @param {string | undefined | null} value
 * @returns {string}
 */
export function normalizeBackendUrl(value) {
	const raw = String(value || "").trim();
	if (!raw) {
		return "http://localhost:4000";
	}
	if (/^https?:\/\//i.test(raw)) {
		return raw.replace(/\/$/, "");
	}
	if (raw.startsWith("//")) {
		return `https:${raw}`.replace(/\/$/, "");
	}
	if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) {
		return `http://${raw}`.replace(/\/$/, "");
	}
	return `https://${raw}`.replace(/\/$/, "");
}

/**
 * Reads backend base URL from common env keys with fallback.
 * @returns {string}
 */
export function getBackendBaseUrl() {
	return normalizeBackendUrl(
		import.meta.env.VITE_BACKEND_URL ||
		import.meta.env.VITE_API_URL ||
		import.meta.env.VITE_SOCKET_URL ||
		"http://localhost:4000"
	);
}
