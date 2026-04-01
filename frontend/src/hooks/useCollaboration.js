import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { createSocketClient } from "../services/socketClient.js";

/**
 * Builds a sorted user list from awareness state.
 * @param {Awareness} awareness - Awareness instance.
 * @returns {Array<{ id: number, name: string, color: string, isSelf: boolean }>}
 */
function buildUsersFromAwareness(awareness) {
	const users = [];
	awareness.getStates().forEach((state, clientId) => {
		const user = state?.user;
		if (!user?.name || !user?.color) {
			return;
		}

		users.push({
			id: clientId,
			name: user.name,
			color: user.color,
			isSelf: clientId === awareness.clientID
		});
	});

	return users.sort((left, right) => {
		if (left.isSelf && !right.isSelf) {
			return -1;
		}
		if (!left.isSelf && right.isSelf) {
			return 1;
		}
		return left.name.localeCompare(right.name);
	});
}

/**
 * Manages Yjs and awareness synchronization for a document room.
 * @param {{ documentId: string, currentUser: { name: string, color: string } }} params - Hook parameters.
 * @returns {{ ydoc: Y.Doc, awareness: Awareness, ready: boolean, onlineUsers: Array<{ id: number, name: string, color: string, isSelf: boolean }> }}
 */
export function useCollaboration({ documentId, currentUser }) {
	const ydoc = useMemo(() => new Y.Doc(), []);
	const awareness = useMemo(() => new Awareness(ydoc), [ydoc]);
	const socketRef = useRef(null);
	const [ready, setReady] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState([]);

	useEffect(() => {
		const socket = createSocketClient();
		socketRef.current = socket;

		const handleLocalYjsUpdate = (update, origin) => {
			if (origin === "remote") {
				return;
			}
			socket.emit("yjs-update", { documentId, update: Array.from(update) });
		};

		const handleRemoteYjsUpdate = (update) => {
			const payload = update instanceof Uint8Array ? update : new Uint8Array(update);
			Y.applyUpdate(ydoc, payload, "remote");
		};

		const pushAwarenessList = () => {
			setOnlineUsers(buildUsersFromAwareness(awareness));
		};

		const handleLocalAwarenessUpdate = ({ added, updated, removed }, origin) => {
			if (origin === "remote") {
				return;
			}

			const changedClients = [...added, ...updated, ...removed];
			if (changedClients.length === 0) {
				return;
			}

			const payload = encodeAwarenessUpdate(awareness, changedClients);
			socket.emit("awareness-update", {
				documentId,
				update: Array.from(payload),
				clientId: awareness.clientID
			});
			pushAwarenessList();
		};

		const handleRemoteAwarenessUpdate = (update) => {
			const payload = update instanceof Uint8Array ? update : new Uint8Array(update);
			applyAwarenessUpdate(awareness, payload, "remote");
			pushAwarenessList();
		};

		const handlePresenceState = (presenceEntries) => {
			const users = (presenceEntries || [])
				.map((entry) => {
					const user = entry?.state?.user;
					if (!user?.name || !user?.color) {
						return null;
					}
					return {
						id: entry.clientId,
						name: user.name,
						color: user.color,
						isSelf: entry.clientId === awareness.clientID
					};
				})
				.filter(Boolean)
				.sort((left, right) => {
					if (left.isSelf && !right.isSelf) {
						return -1;
					}
					if (!left.isSelf && right.isSelf) {
						return 1;
					}
					return left.name.localeCompare(right.name);
				});

			setOnlineUsers(users);
		};

		const handleDisconnect = () => {
			setReady(false);
		};

		const handleDocumentRestored = () => {
			window.location.reload();
		};

		socket.on("connect", () => {
			socket.emit("join-document", {
				documentId,
				user: currentUser
			});

			awareness.setLocalStateField("user", {
				name: currentUser.name,
				color: currentUser.color
			});
			socket.emit("awareness-update", {
				documentId,
				update: Array.from(encodeAwarenessUpdate(awareness, [awareness.clientID])),
				clientId: awareness.clientID
			});
			pushAwarenessList();

			setReady(true);
		});
		socket.on("disconnect", handleDisconnect);
		socket.on("document-restored", handleDocumentRestored);

		socket.on("document-state", handleRemoteYjsUpdate);
		socket.on("yjs-update", handleRemoteYjsUpdate);
		socket.on("awareness-update", handleRemoteAwarenessUpdate);
		socket.on("presence-state", handlePresenceState);

		ydoc.on("update", handleLocalYjsUpdate);
		awareness.on("update", handleLocalAwarenessUpdate);

		return () => {
			awareness.off("update", handleLocalAwarenessUpdate);
			ydoc.off("update", handleLocalYjsUpdate);
			awareness.setLocalState(null);
			socket.off("disconnect", handleDisconnect);
			socket.off("document-restored", handleDocumentRestored);
			socket.disconnect();
			socketRef.current = null;
		};
	}, [awareness, currentUser, documentId, ydoc]);

	/**
	 * Requests a server-side restore to a selected revision.
	 * @param {string} revisionId - Revision identifier.
	 * @returns {Promise<void>}
	 */
	async function requestRevisionRestore(revisionId) {
		if (!socketRef.current) {
			throw new Error("Socket is not connected.");
		}

		await new Promise((resolve, reject) => {
			socketRef.current.emit(
				"restore-document",
				{
					documentId,
					revisionId,
					restoredBy: currentUser.name
				},
				(response) => {
					if (!response?.ok) {
						reject(new Error(response?.message || "Restore failed."));
						return;
					}

					resolve();
				}
			);
		});
	}

	return {
		ydoc,
		awareness,
		ready,
		onlineUsers,
		requestRevisionRestore
	};
}
