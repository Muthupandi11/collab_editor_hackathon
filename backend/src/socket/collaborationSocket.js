import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import * as awarenessProtocol from "y-protocols/awareness";
import { startSnapshotJob } from "../jobs/snapshotJob.js";
import { getDocumentById, restoreRevision, upsertDocument } from "../services/revisionService.js";
import { logInfo } from "../utils/logger.js";

/** @type {Map<string, { doc: Y.Doc, awareness: Awareness, clients: Set<string>, snapshotWorker?: { stop: () => void } }>} */
const rooms = new Map();
const roomHydrationJobs = new Map();
const roomTitles = new Map();
const roomTyping = new Map();
const roomChats = new Map();
const roomReactions = new Map();

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
	roomTitles.delete(documentId);
	roomTyping.delete(documentId);
	roomChats.delete(documentId);
	roomReactions.delete(documentId);
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

		socket.on("ping-latency", (ack) => {
			if (typeof ack === "function") {
				ack();
			}
		});

		socket.on("join-document", (payload = {}) => {
			const documentId = payload.documentId || payload.roomId;
			if (!documentId) {
				return;
			}

			const resolvedUser = payload.user || {
				id: payload.userId || socket.id,
				name: payload.username || `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
				color: payload.color || "#2563EB"
			};

			socket.data.documentId = documentId;
			socket.data.user = resolvedUser;
			socket.join(documentId);

			const room = getOrCreateRoom(documentId);
			room.clients.add(socket.id);

			upsertDocument(documentId, {
				createdBy: resolvedUser?.name || "anonymous",
				updatedBy: resolvedUser?.name || "anonymous"
			}).catch(() => {
				// Avoid failing join flow if metadata upsert fails.
			});

			const stateUpdate = Y.encodeStateAsUpdate(room.doc);
			socket.emit("document-state", stateUpdate);

			const awarenessClients = Array.from(room.awareness.getStates().entries()).map(
				([clientId, state]) => ({ clientId, state })
			);
			socket.emit("presence-state", awarenessClients);
			socket.emit("title-updated", {
				documentId,
				title: roomTitles.get(documentId) || "Untitled Document"
			});
			socket.emit("chat-history", roomChats.get(documentId) || []);

			logInfo("Joined document room", { documentId, socketId: socket.id });
		});

		socket.on("yjs-update", ({ documentId, update }, ack) => {
			if (!documentId || !update) {
				if (typeof ack === "function") {
					ack({ ok: false, message: "documentId and update are required" });
				}
				return;
			}

			const room = getOrCreateRoom(documentId);
			const payload = update instanceof Uint8Array ? update : new Uint8Array(update);

			Y.applyUpdate(room.doc, payload);
			socket.to(documentId).emit("yjs-update", payload);

			if (typeof ack === "function") {
				ack({ ok: true, receivedAt: Date.now() });
			}
		});

		socket.on("awareness-update", ({ documentId, update, clientId }) => {
			if (!documentId || !update) {
				return;
			}

			const room = getOrCreateRoom(documentId);
			const payload = update instanceof Uint8Array ? update : new Uint8Array(update);

			if (Number.isInteger(clientId)) {
				socket.data.awarenessClientIds.add(clientId);
			}

			awarenessProtocol.applyAwarenessUpdate(room.awareness, payload, socket.id);
			socket.to(documentId).emit("awareness-update", payload);
		});

		socket.on("typing-start", ({ roomId, userId, username }) => {
			if (!roomId || !userId) {
				return;
			}

			const roomUsers = roomTyping.get(roomId) || new Map();
			const existing = roomUsers.get(userId);
			if (existing?.timeout) {
				clearTimeout(existing.timeout);
			}

			const timeout = setTimeout(() => {
				const nextRoomUsers = roomTyping.get(roomId);
				nextRoomUsers?.delete(userId);
				socket.to(roomId).emit("user-stopped-typing", { roomId, userId });
				socket.to(roomId).emit("user-stopped", { roomId, userId });
			}, 3000);

			roomUsers.set(userId, { username: username || "Someone", timeout });
			roomTyping.set(roomId, roomUsers);
			socket.to(roomId).emit("user-typing", { roomId, userId, username: username || "Someone" });
		});

		socket.on("typing-stop", ({ roomId, userId }) => {
			if (!roomId || !userId) {
				return;
			}

			const roomUsers = roomTyping.get(roomId);
			const entry = roomUsers?.get(userId);
			if (entry?.timeout) {
				clearTimeout(entry.timeout);
			}
			roomUsers?.delete(userId);
			socket.to(roomId).emit("user-stopped-typing", { roomId, userId });
			socket.to(roomId).emit("user-stopped", { roomId, userId });
		});

		const handleIncomingMessage = ({ message, roomId, userId, username, color }) => {
			if (!roomId || typeof message !== "string") {
				return;
			}

			const trimmed = message.trim();
			if (!trimmed || trimmed.length > 500) {
				return;
			}

			const msg = {
				id: `${Date.now()}-${Math.random()}`,
				userId: userId || socket.data?.user?.id || socket.id,
				username: username || socket.data?.user?.name || "Guest",
				color: color || "#2563EB",
				message: trimmed,
				timestamp: new Date().toISOString()
			};

			if (!roomChats.has(roomId)) {
				roomChats.set(roomId, []);
			}
			const history = roomChats.get(roomId);
			history.push(msg);
			if (history.length > 50) {
				history.shift();
			}

			io.to(roomId).emit("new-message", msg);
			io.to(roomId).emit("receive-message", msg);
		};

		socket.on("chat-message", handleIncomingMessage);
		socket.on("send-message", handleIncomingMessage);

		socket.on("message-reaction", ({ roomId, messageId, emoji, userId }) => {
			if (!roomId || !messageId || !emoji) {
				return;
			}

			if (!roomReactions.has(roomId)) {
				roomReactions.set(roomId, new Map());
			}
			const reactionsByMessage = roomReactions.get(roomId);
			if (!reactionsByMessage.has(messageId)) {
				reactionsByMessage.set(messageId, new Map());
			}

			const emojiBucket = reactionsByMessage.get(messageId);
			if (!emojiBucket.has(emoji)) {
				emojiBucket.set(emoji, new Set());
			}

			const users = emojiBucket.get(emoji);
			const reactionUser = String(userId || socket.data?.user?.id || socket.id);
			if (users.has(reactionUser)) {
				users.delete(reactionUser);
			} else {
				users.add(reactionUser);
			}

			const reactionPayload = Array.from(emojiBucket.entries()).map(([key, value]) => ({
				emoji: key,
				count: value.size
			}));

			io.to(roomId).emit("message-reaction-updated", {
				roomId,
				messageId,
				reactions: reactionPayload
			});
		});

		socket.on("cursor-move", ({ userId, username, color, position, roomId }) => {
			if (!roomId || typeof position !== "number") {
				return;
			}

			socket.to(roomId).emit("cursor-update", {
				userId: userId || socket.id,
				username: username || socket.data?.user?.name || "Guest",
				color: color || socket.data?.user?.color || "#2563EB",
				position,
				timestamp: Date.now()
			});
		});

		socket.on("title-change", async ({ roomId, title, updatedBy }) => {
			if (!roomId || typeof title !== "string") {
				return;
			}

			const nextTitle = title.trim() || "Untitled Document";
			roomTitles.set(roomId, nextTitle);
			socket.to(roomId).emit("title-updated", { roomId, title: nextTitle });

			try {
				await upsertDocument(roomId, {
					title: nextTitle,
					updatedBy: updatedBy || socket.data?.user?.name || "anonymous"
				});
			} catch {
				// Do not interrupt live editing if metadata persistence fails.
			}
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
