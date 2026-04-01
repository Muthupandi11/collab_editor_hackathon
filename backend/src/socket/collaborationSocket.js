import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import * as awarenessProtocol from "y-protocols/awareness";
import { startSnapshotJob } from "../jobs/snapshotJob.js";
import { getDocumentById, restoreRevision, upsertDocument } from "../services/revisionService.js";
import { logInfo } from "../utils/logger.js";

/** @type {Map<string, { doc: Y.Doc, awareness: Awareness, clients: Set<string>, snapshotWorker?: { stop: () => void } }>} */
const rooms = new Map();
const roomHydrationJobs = new Map();

/**
 * Returns an existing room or creates a new in-memory room.
 * @param {string} documentId - Unique room/document identifier.
 * @returns {{ doc: Y.Doc, awareness: Awareness, clients: Set<string> }}
 */
function getOrCreateRoom(documentId) {
	if (!rooms.has(documentId)) {
		const doc = new Y.Doc();
		const awareness = new Awareness(doc);
		const clients = new Set();
		const snapshotWorker = startSnapshotJob({
			documentId,
			getSnapshot: () => Y.encodeStateAsUpdate(doc),
			intervalMs: 30000
		});
		rooms.set(documentId, { doc, awareness, clients, snapshotWorker });

		if (!roomHydrationJobs.has(documentId)) {
			const hydrationJob = getDocumentById(documentId)
				.then((document) => {
					if (document?.yjsState?.length) {
						Y.applyUpdate(doc, new Uint8Array(document.yjsState));
					}
				})
				.finally(() => {
					roomHydrationJobs.delete(documentId);
				});

			roomHydrationJobs.set(documentId, hydrationJob);
		}
	}

	return rooms.get(documentId);
}

/**
 * Removes an in-memory room when all clients have disconnected.
 * @param {string} documentId - Unique room/document identifier.
 * @returns {void}
 */
function cleanupRoomIfEmpty(documentId) {
	const room = rooms.get(documentId);
	if (!room || room.clients.size > 0) {
		return;
	}

	room.doc.destroy();
	room.snapshotWorker?.stop();
	rooms.delete(documentId);
	logInfo("Room cleaned up", { documentId });
}

/**
 * Registers Socket.IO handlers for real-time Yjs collaboration.
 * @param {import("socket.io").Server} io - Socket.IO server instance.
 * @returns {void}
 */
export function registerCollaborationSocket(io) {
	io.on("connection", (socket) => {
		socket.data.awarenessClientIds = new Set();
		logInfo("Socket connected", { socketId: socket.id });

		socket.on("join-document", ({ documentId, user }) => {
			if (!documentId) {
				return;
			}

			socket.data.documentId = documentId;
			socket.data.user = user || null;
			socket.join(documentId);

			const room = getOrCreateRoom(documentId);
			room.clients.add(socket.id);

			upsertDocument(documentId, {
				createdBy: user?.name || "anonymous",
				updatedBy: user?.name || "anonymous"
			}).catch(() => {
				// Avoid failing join flow if metadata upsert fails.
			});

			const stateUpdate = Y.encodeStateAsUpdate(room.doc);
			socket.emit("document-state", stateUpdate);

			const awarenessClients = Array.from(room.awareness.getStates().entries()).map(
				([clientId, state]) => ({ clientId, state })
			);
			socket.emit("presence-state", awarenessClients);

			logInfo("Joined document room", { documentId, socketId: socket.id });
		});

		socket.on("yjs-update", ({ documentId, update }) => {
			if (!documentId || !update) {
				return;
			}

			const room = getOrCreateRoom(documentId);
			const payload = update instanceof Uint8Array ? update : new Uint8Array(update);

			Y.applyUpdate(room.doc, payload);
			socket.to(documentId).emit("yjs-update", payload);
		});

		socket.on("awareness-update", ({ documentId, update }) => {
			if (!documentId || !update) {
				return;
			}

			const room = getOrCreateRoom(documentId);
			const payload = update instanceof Uint8Array ? update : new Uint8Array(update);
			const updatedClientIds = awarenessProtocol.decodeAwarenessUpdate(payload, room.awareness);

			for (const clientId of updatedClientIds.keys()) {
				socket.data.awarenessClientIds.add(clientId);
			}

			awarenessProtocol.applyAwarenessUpdate(room.awareness, payload, socket.id);
			socket.to(documentId).emit("awareness-update", payload);
		});

			socket.on("restore-document", async ({ documentId, revisionId, restoredBy }, ack) => {
				if (!documentId || !revisionId) {
					if (typeof ack === "function") {
						ack({ ok: false, message: "documentId and revisionId are required." });
					}
					return;
				}

				try {
					const restored = await restoreRevision(documentId, revisionId, restoredBy || "system");
					if (!restored) {
						if (typeof ack === "function") {
							ack({ ok: false, message: "Revision not found." });
						}
						return;
					}

					const room = rooms.get(documentId);
					if (room) {
						room.snapshotWorker?.stop();
						room.doc.destroy();
						rooms.delete(documentId);
					}

					io.to(documentId).emit("document-restored", {
						documentId,
						revisionId
					});

					if (typeof ack === "function") {
						ack({ ok: true });
					}
				} catch (error) {
					if (typeof ack === "function") {
						ack({ ok: false, message: error.message });
					}
				}
			});

		socket.on("disconnect", () => {
			const { documentId } = socket.data;
			if (!documentId) {
				return;
			}

			const room = rooms.get(documentId);
			if (!room) {
				return;
			}

			room.clients.delete(socket.id);
			const awarenessIds = Array.from(socket.data.awarenessClientIds || []);
			if (awarenessIds.length > 0) {
				awarenessProtocol.removeAwarenessStates(room.awareness, awarenessIds, socket.id);
					const payload = awarenessProtocol.encodeAwarenessUpdate(room.awareness, awarenessIds);
					socket.to(documentId).emit("awareness-update", payload);
			}

			cleanupRoomIfEmpty(documentId);
			logInfo("Socket disconnected", { socketId: socket.id, documentId });
		});
	});
}
