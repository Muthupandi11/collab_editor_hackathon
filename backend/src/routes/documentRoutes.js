import { Router } from "express";
import {
	createRevisionSnapshot,
	getApiStatus,
	getDocumentRevisions,
	getDocumentRoom,
	restoreDocumentRevision,
	upsertDocumentMetadata
} from "../controllers/documentController.js";

const router = Router();

router.get("/status", getApiStatus);
router.post("/:documentId", upsertDocumentMetadata);
router.get("/:documentId", getDocumentRoom);
router.get("/:documentId/revisions", getDocumentRevisions);
router.post("/:documentId/revisions", createRevisionSnapshot);
router.post("/:documentId/revisions/:revisionId/restore", restoreDocumentRevision);

export default router;
