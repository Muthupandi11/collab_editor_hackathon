/** @type {string} Base backend URL from environment */
const BACKEND_URL =
	import.meta.env.VITE_BACKEND_URL ||
	import.meta.env.VITE_API_URL ||
	"http://localhost:4000";

function timeoutSignal(ms = 10000) {
	if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
		return AbortSignal.timeout(ms);
	}

	const controller = new AbortController();
	setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), ms);
	return controller.signal;
}

/**
 * Fetch revision history for a document
 * @param {string} docId - Document ID
 * @returns {Promise<Array>} Array of revision objects with timestamp, content, author
 */
export const fetchRevisions = async (docId) => {
	const endpoint = `${BACKEND_URL.replace(/\/$/, "")}/api/revisions/${docId}`;

	try {
		const response = await fetch(endpoint, {
			method: "GET",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			signal: timeoutSignal(10000)
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		return data?.revisions || [];
	} catch (error) {
		if (error?.name === "AbortError" || error?.name === "TimeoutError") {
			throw new Error("Request timed out");
		}
		throw new Error(error?.message || "Failed to load revisions");
	}
};

/**
 * Save a new revision to the database
 * @param {string} docId - Document ID
 * @param {string} content - Document content (plaintext or HTML)
 * @param {string} author - Author name or username
 * @returns {Promise<Object>} Created revision object
 */
export const saveRevision = async (docId, content, author) => {
	try {
		const response = await fetch(
			`${BACKEND_URL.replace(/\/$/, "")}/api/revisions`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ docId, content, author, roomId: docId })
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to save revision: HTTP ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		throw new Error(error?.message || "Failed to save revision");
	}
};

/**
 * Restore a document to a previous revision
 * @param {string} revisionId - Revision ID to restore
 * @returns {Promise<Object>} Restored revision content
 */
export const restoreRevision = async (docId, revisionId) => {
	try {
		const response = await fetch(
			`${BACKEND_URL.replace(/\/$/, "")}/api/revisions/restore/${revisionId}`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ docId })
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to restore revision: HTTP ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		throw new Error(error?.message || "Failed to restore revision");
	}
};
