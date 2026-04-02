import {
	appendRevision,
	getDocumentById,
	listRevisions,
	restoreRevision,
	upsertDocument
} from "../services/revisionService.js";

/**
 * Returns a basic API health payload.
 * @param {import("express").Request} _req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {void}
 */
export function getApiStatus(_req, res) {
	res.status(200).json({
		status: "ok",
		service: "collab-editor-backend",
		realtime: "socket.io+yjs",
		storage: "mongodb"
	});
}

/**
 * Returns metadata for a requested document room.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
export async function getDocumentRoom(req, res) {
	const { documentId } = req.params;

	try {
		const document = await getDocumentById(documentId);
		if (!document) {
			res.status(200).json({
				success: true,
				documentId,
				title: "Untitled Document",
				content: "",
				revisionCount: 0,
				message: "Document metadata initialized on first save."
			});
			return;
		}

		res.status(200).json({
			success: true,
			documentId: document.documentId,
			title: document.title,
			content: document.content || "",
			createdBy: document.createdBy,
			updatedBy: document.updatedBy,
			revisionCount: document.revisions?.length || 0,
			updatedAt: document.updatedAt,
			lastModified: document.lastModified || document.updatedAt
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
}

/**
 * Creates or updates document metadata.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
export async function upsertDocumentMetadata(req, res) {
	const { documentId } = req.params;

	try {
		const updated = await upsertDocument(documentId, {
			title: req.body?.title,
			content: req.body?.content,
			updatedBy: req.body?.updatedBy,
			createdBy: req.body?.createdBy
		});

		res.status(200).json({
			success: true,
			documentId: updated.documentId,
			title: updated.title,
			content: updated.content || "",
			updatedBy: updated.updatedBy,
			updatedAt: updated.updatedAt,
			lastModified: updated.lastModified || updated.updatedAt
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
}

/**
 * Adds a revision snapshot for a document.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
export async function createRevisionSnapshot(req, res) {
	const { documentId } = req.params;

	try {
		const snapshot = req.body?.snapshot;
		if (!snapshot) {
			res.status(400).json({ message: "snapshot is required" });
			return;
		}

		await appendRevision(documentId, {
			snapshot: Buffer.from(snapshot, "base64"),
			createdBy: req.body?.createdBy,
			summary: req.body?.summary
		});

		res.status(201).json({ message: "Revision snapshot created" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

/**
 * Lists revision history for a document.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
export async function getDocumentRevisions(req, res) {
	const { documentId } = req.params;

	try {
		const revisions = await listRevisions(documentId, Number.parseInt(req.query?.limit || "20", 10));
		res.status(200).json({ success: true, revisions });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
}

/**
 * Restores a document state from a historical revision.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
export async function restoreDocumentRevision(req, res) {
	const { documentId, revisionId } = req.params;

	try {
		const restored = await restoreRevision(documentId, revisionId, req.body?.restoredBy || "system");
		if (!restored) {
			res.status(404).json({ success: false, message: "Revision not found" });
			return;
		}

		res.status(200).json({
			success: true,
			snapshot: restored.snapshot.toString("base64"),
			content: restored.content || ""
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
}
