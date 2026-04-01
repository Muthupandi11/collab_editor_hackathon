import { appendRevision } from "../services/revisionService.js";
import { logError } from "../utils/logger.js";

/**
 * Creates a snapshot interval worker for a specific document room.
 * @param {{ documentId: string, getSnapshot: () => Uint8Array | Buffer, intervalMs?: number }} options - Snapshot worker options.
 * @returns {{ stop: () => void }}
 */
export function startSnapshotJob(options) {
	const { documentId, getSnapshot, intervalMs = 30000 } = options;

	const timer = setInterval(async () => {
		try {
			const snapshot = getSnapshot();
			if (!snapshot || snapshot.length === 0) {
				return;
			}

			await appendRevision(documentId, {
				snapshot,
				createdBy: "system",
				summary: "Auto snapshot"
			});
		} catch (error) {
			logError("Snapshot job failed", { documentId, error: error.message });
		}
	}, intervalMs);

	return {
		stop() {
			clearInterval(timer);
		}
	};
}
