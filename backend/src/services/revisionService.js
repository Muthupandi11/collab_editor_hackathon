import Document from "../models/Document.js";
import Revision from "../models/Revision.js";

const MAX_REVISION_COUNT = 100;
const MAX_CONTENT_REVISIONS = 50;

function createPreview(content) {
	return String(content || "")
		.replace(/<[^>]*>/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 80);
}

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
		content,
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

	if (typeof content === "string") {
		setPayload.content = content;
	}

	if (yjsState) {
		setPayload.yjsState = Buffer.from(yjsState);
	}

	setPayload.lastModified = new Date();

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
	const latestContent = typeof revision.content === "string" ? revision.content : undefined;
	const latestTitle = typeof revision.title === "string" ? revision.title : undefined;

	return Document.findOneAndUpdate(
		{ documentId },
		{
			$push: {
				revisions: {
					$each: [snapshotEntry],
					$slice: -MAX_REVISION_COUNT
				}
			},
			$set: {
				yjsState: snapshotEntry.snapshot,
				updatedBy: snapshotEntry.createdBy,
				lastModified: new Date(),
				...(latestContent !== undefined ? { content: latestContent } : {}),
				...(latestTitle ? { title: latestTitle } : {})
			},
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
		.map((revision, index) => ({
			_id: revision._id,
			createdAt: revision.createdAt,
			createdBy: revision.createdBy,
			summary: revision.summary,
			version: index + 1
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
	let restoredContent = "";
	try {
		const decoded = JSON.parse(snapshot.toString("utf8"));
		restoredContent = typeof decoded?.content === "string" ? decoded.content : "";
	} catch {
		restoredContent = "";
	}
	doc.yjsState = snapshot;
	doc.content = restoredContent || doc.content;
	doc.updatedBy = restoredBy;
	doc.lastModified = new Date();
	doc.revisions.push({
		snapshot,
		summary: `Restored revision ${revisionId}`,
		createdBy: restoredBy
	});

	if (doc.revisions.length > MAX_REVISION_COUNT) {
		doc.revisions = doc.revisions.slice(-MAX_REVISION_COUNT);
	}

	await doc.save();
	return { snapshot, content: restoredContent };
}

/**
 * Get revisions for a document (wrapper for listRevisions)
 * @param {string} documentId - Unique document room identifier.
 * @param {number} [limit=20] - Maximum number of revisions to return.
 * @returns {Promise<Array>} Array of revision metadata sorted by newest first.
 */
export async function getRevisions(documentId, limit = 20) {
	const cap = Math.max(1, Math.min(limit, MAX_CONTENT_REVISIONS));
	const rows = await Revision.find({ docId: documentId })
		.sort({ timestamp: -1 })
		.limit(cap)
		.lean();

	return rows.map((revision, index) => ({
		_id: revision._id,
		createdAt: revision.timestamp,
		timestamp: revision.timestamp,
		createdBy: revision.createdBy || "Unknown",
		summary: revision.preview || "Revision snapshot",
		preview: revision.preview || "",
		content: revision.content || "",
		version: rows.length - index
	}));
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
		const preview = createPreview(content) || "Revision snapshot";

		const revision = await Revision.create({
			docId: documentId,
			roomId: documentId,
			content,
			preview,
			createdBy: author,
			timestamp: new Date()
		});

		await upsertDocument(documentId, {
			content,
			updatedBy: author,
			createdBy: author
		});

		const count = await Revision.countDocuments({ docId: documentId });
		if (count > MAX_CONTENT_REVISIONS) {
			const stale = await Revision.find({ docId: documentId })
				.sort({ timestamp: 1 })
				.limit(count - MAX_CONTENT_REVISIONS)
				.select("_id")
				.lean();
			if (stale.length > 0) {
				await Revision.deleteMany({ _id: { $in: stale.map((entry) => entry._id) } });
			}
		}

		return {
			_id: revision._id,
			createdAt: revision.timestamp,
			createdBy: revision.createdBy,
			summary: revision.preview,
			preview: revision.preview,
			content: revision.content
		};
	} catch (error) {
		throw new Error(`Failed to save revision: ${error.message}`);
	}
}

/**
 * Restores plain content from revision collection.
 * @param {string} documentId - Unique document room identifier.
 * @param {string} revisionId - Revision identifier.
 * @param {string} restoredBy - User restoring the revision.
 * @returns {Promise<{ content: string, revision: any } | null>}
 */
export async function restoreContentRevision(documentId, revisionId, restoredBy = "system") {
	const revision = await Revision.findOne({ _id: revisionId, docId: documentId }).lean();
	if (!revision) {
		return null;
	}

	await upsertDocument(documentId, {
		content: revision.content,
		updatedBy: restoredBy,
		createdBy: restoredBy
	});

	await saveRevision(documentId, revision.content, restoredBy);
	return {
		content: revision.content,
		revision
	};
}
