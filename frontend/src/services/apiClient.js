const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Fetches revision history for a document.
 * @param {string} documentId - Unique room/document identifier.
 * @returns {Promise<Array<{ _id: string, createdAt: string, createdBy: string, summary: string }>>}
 */
export async function fetchRevisions(documentId) {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/revisions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch revisions (${response.status})`);
  }

  const payload = await response.json();
  return payload.revisions || [];
}