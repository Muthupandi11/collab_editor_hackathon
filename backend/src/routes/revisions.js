import express from "express";
import * as revisionService from "../services/revisionService.js";

const router = express.Router();

/**
 * GET /api/revisions/:docId
 * Fetch the last 20 revisions for a document, sorted by timestamp (newest first)
 */
router.get("/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const revisions = await revisionService.getRevisions(docId, 20);
		res.json({ success: true, revisions });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

/**
 * POST /api/revisions
 * Save a new revision to the database
 * Body: { docId, content, author }
 */
router.post("/", async (req, res) => {
	try {
		const { docId, content, author } = req.body;

		if (!docId || !content) {
			return res.status(400).json({ error: "docId and content are required" });
		}

		const revision = await revisionService.saveRevision(docId, content, author || "Unknown");
		res.status(201).json({ success: true, revision });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

/**
 * POST /api/revisions/restore/:revisionId
 * Restore a document to a specific revision
 */
router.post("/restore/:revisionId", async (req, res) => {
	try {
		const { revisionId } = req.params;
		const { docId, restoredBy } = req.body;

		if (!docId) {
			return res.status(400).json({ error: "docId is required" });
		}

		const restored = await revisionService.restoreRevision(docId, revisionId, restoredBy || "system");
		if (!restored) {
			return res.status(404).json({ error: "Revision not found" });
		}

		res.json({
			success: true,
			revisionId,
			docId,
			content: restored.content || "",
			snapshot: restored.snapshot.toString("base64")
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

export default router;
