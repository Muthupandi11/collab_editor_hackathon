/** @type {string} Base backend URL from environment */
import { getBackendBaseUrl } from "./backendUrl.js";

const BASE_URL = getBackendBaseUrl();

function timeoutSignal(ms = 10000) {
	if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
		return AbortSignal.timeout(ms);
	}

	const controller = new AbortController();
	setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), ms);
	return controller.signal;
}

async function parseJsonResponse(response, endpoint) {
	const text = await response.text();
	try {
		return text ? JSON.parse(text) : {};
	} catch {
		throw new Error(`Expected JSON but got non-JSON response from ${endpoint}`);
	}
}

async function fetchFromEndpoints(endpoints, options = {}) {
	let lastError = null;

	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint, {
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					...(options.headers || {})
				},
				signal: timeoutSignal(10000),
				...options
			});

			if (!response.ok) {
				lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
				continue;
			}

			const contentType = response.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				lastError = new Error(`Expected JSON but got ${contentType || "unknown content-type"} from ${endpoint}`);
				continue;
			}

			return parseJsonResponse(response, endpoint);
		} catch (error) {
			if (error?.name === "AbortError" || error?.name === "TimeoutError") {
				lastError = new Error("Request timed out");
				continue;
			}
			lastError = error;
		}
	}

	throw lastError || new Error("Request failed");
}

/**
 * Fetch revision history for a document
 * @param {string} docId - Document ID
 * @returns {Promise<Array>} Array of revision objects with timestamp, content, author
 */
export const fetchRevisions = async (docId) => {
	const endpoints = [
		`${BASE_URL}/api/revisions/${docId}`,
		`${BASE_URL}/api/documents/${docId}/revisions`
	];

	try {
		const data = await fetchFromEndpoints(endpoints, { method: "GET" });
		return data?.revisions || [];
	} catch (error) {
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
		return await fetchFromEndpoints(
			[`${BASE_URL}/api/revisions`, `${BASE_URL}/api/documents/${docId}/revisions`],
			{
				method: "POST",
				body: JSON.stringify({
					docId,
					content,
					author,
					roomId: docId,
					summary: String(content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
				})
			}
		);
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
		return await fetchFromEndpoints(
			[
				`${BASE_URL}/api/revisions/restore/${revisionId}`,
				`${BASE_URL}/api/documents/${docId}/revisions/${revisionId}/restore`
			],
			{
				method: "POST",
				body: JSON.stringify({ docId, documentId: docId, restoredBy: "user" })
			}
		);
	} catch (error) {
		throw new Error(error?.message || "Failed to restore revision");
	}
};
