/** @type {string} Base backend URL from environment */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/**
 * Fetch revision history for a document
 * @param {string} docId - Document ID
 * @returns {Promise<Array>} Array of revision objects with timestamp, content, author
 */
export const fetchRevisions = async (docId) => {
	try {
		const response = await fetch(
			`${BACKEND_URL}/api/revisions/${docId}`,
			{
				method: "GET",
				credentials: "include",
				headers: { "Content-Type": "application/json" }
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch revisions: ${response.statusText}`);
		}

		const data = await response.json();
		return data.revisions || [];
	} catch (error) {
		console.error("Error fetching revisions:", error.message);
		throw error;
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
			`${BACKEND_URL}/api/revisions`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ docId, content, author })
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to save revision: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error saving revision:", error.message);
		throw error;
	}
};

/**
 * Restore a document to a previous revision
 * @param {string} revisionId - Revision ID to restore
 * @returns {Promise<Object>} Restored revision content
 */
export const restoreRevision = async (revisionId) => {
	try {
		const response = await fetch(
			`${BACKEND_URL}/api/revisions/restore/${revisionId}`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" }
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to restore revision: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error restoring revision:", error.message);
		throw error;
	}
};
