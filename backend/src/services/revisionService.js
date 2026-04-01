import Document from "../models/Document.js";

const MAX_REVISION_COUNT = 100;

/**
 * Gets an existing document by its room identifier.
 * @param {string} documentId - Unique document room identifier.
 * @returns {Promise<import("mongoose").HydratedDocument<any> | null>}
 */
export async function getDocumentById(documentId) {
	return Document.findOne({ documentId }).lean();
}

/**
 * Creates or updates a document metadata/state record.
 * @param {string} documentId - Unique document room identifier.
 * @param {{ title?: string, yjsState?: Uint8Array | Buffer, updatedBy?: string, createdBy?: string }} payload - Upsert payload.
 * @returns {Promise<import("mongoose").HydratedDocument<any>>}
 */
export async function upsertDocument(documentId, payload = {}) {
	const {
		title,
		yjsState,
		updatedBy = "anonymous",
		createdBy = "anonymous"
	} = payload;

	const setPayload = {
		updatedBy
	};

	if (typeof title === "string" && title.trim().length > 0) {
		setPayload.title = title.trim();
	}

	if (yjsState) {
		setPayload.yjsState = Buffer.from(yjsState);
	}

	return Document.findOneAndUpdate(
		{ documentId },
		{
			$set: setPayload,
			$setOnInsert: {
				documentId,
				createdBy
			}
		},
		{ new: true, upsert: true }
	);
}

/**
 * Appends a revision snapshot to a document while enforcing retention limits.
 * @param {string} documentId - Unique document room identifier.
 * @param {{ snapshot: Uint8Array | Buffer, createdBy?: string, summary?: string }} revision - Revision payload.
 * @returns {Promise<import("mongoose").HydratedDocument<any> | null>}
 */
export async function appendRevision(documentId, revision) {
	if (!revision?.snapshot) {
		throw new Error("Snapshot data is required to append a revision.");
	}

	const snapshotEntry = {
		snapshot: Buffer.from(revision.snapshot),
		createdBy: revision.createdBy || "system",
		summary: revision.summary || "Auto snapshot"
	};

	return Document.findOneAndUpdate(
		{ documentId },
		{
			$push: {
				revisions: {
					$each: [snapshotEntry],
					$slice: -MAX_REVISION_COUNT
				}
			},
			$set: { yjsState: snapshotEntry.snapshot, updatedBy: snapshotEntry.createdBy },
			$setOnInsert: {
				documentId,
				createdBy: snapshotEntry.createdBy
			}
		},
		{ new: true, upsert: true }
	);
}

/**
 * Lists recent revision metadata for a document.
 * @param {string} documentId - Unique document room identifier.
 * @param {number} [limit=20] - Maximum number of revisions.
 * @returns {Promise<Array<{ _id: string, createdAt: Date, createdBy: string, summary: string }>>}
 */
export async function listRevisions(documentId, limit = 20) {
	const doc = await Document.findOne(
		{ documentId },
		{ revisions: { $slice: -Math.max(1, Math.min(limit, MAX_REVISION_COUNT)) } }
	).lean();

	if (!doc) {
		return [];
	}

	return [...doc.revisions]
		.reverse()
		.map((revision) => ({
			_id: revision._id,
			createdAt: revision.createdAt,
			createdBy: revision.createdBy,
			summary: revision.summary
		}));
}

/**
 * Restores a revision and writes the snapshot as the latest document state.
 * @param {string} documentId - Unique document room identifier.
 * @param {string} revisionId - Revision object identifier.
 * @param {string} restoredBy - User restoring the revision.
 * @returns {Promise<Buffer | null>}
 */
export async function restoreRevision(documentId, revisionId, restoredBy = "system") {
	const doc = await Document.findOne({ documentId });
	if (!doc) {
		return null;
	}

	const target = doc.revisions.id(revisionId);
	if (!target) {
		return null;
	}

	const snapshot = Buffer.from(target.snapshot);
	doc.yjsState = snapshot;
	doc.updatedBy = restoredBy;
	doc.revisions.push({
		snapshot,
		summary: `Restored revision ${revisionId}`,
		createdBy: restoredBy
	});

	if (doc.revisions.length > MAX_REVISION_COUNT) {
		doc.revisions = doc.revisions.slice(-MAX_REVISION_COUNT);
	}

	await doc.save();
	return snapshot;
}

/**
 * Get revisions for a document (wrapper for listRevisions)
 * @param {string} documentId - Unique document room identifier.
 * @param {number} [limit=20] - Maximum number of revisions to return.
 * @returns {Promise<Array>} Array of revision metadata sorted by newest first.
 */
export async function getRevisions(documentId, limit = 20) {
	return listRevisions(documentId, limit);
}

/**
 * Save a new revision from HTML content
 * @param {string} documentId - Unique document room identifier.
 * @param {string} content - Plain text or HTML content being saved.
 * @param {string} author - Author name/username making the save.
 * @returns {Promise<Object>} Created revision object with _id, createdAt, createdBy, summary.
 */
export async function saveRevision(documentId, content, author = "Unknown") {
	try {
		// Create a buffer from the content string (simplified serialization)
		// In production, you'd want to encode this as Yjs binary
		const snapshot = Buffer.from(JSON.stringify({ content }));
		
		const result = await appendRevision(documentId, {
			snapshot,
			createdBy: author,
			summary: `Saved by ${author}` 
		});

		// Return the latest revision metadata
		if (result && result.revisions && result.revisions.length > 0) {
			const latest = result.revisions[result.revisions.length - 1];
			return {
				_id: latest._id,
				createdAt: latest.createdAt,
				createdBy: latest.createdBy,
				summary: latest.summary
			};
		}
		
		return null;
	} catch (error) {
		throw new Error(`Failed to save revision: ${error.message}`);
	}
}
