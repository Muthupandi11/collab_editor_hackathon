import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { createSocketClient } from "../services/socketClient.js";
import { debounce } from "lodash";

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
	const typingStopTimerRef = useRef(null);
	const retryCountdownRef = useRef(null);
	const wakeupTimerRef = useRef(null);
	const latencyIntervalRef = useRef(null);
	const titleEmitRef = useRef(() => {});
	const [ready, setReady] = useState(false);
	const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting | connected | offline | waking
	const [connectionMessage, setConnectionMessage] = useState("Connecting...");
	const [retryIn, setRetryIn] = useState(0);
	const [attempt, setAttempt] = useState(0);
	const [latency, setLatency] = useState(null);
	const [saveStatus, setSaveStatus] = useState("idle");
	const [typingUsers, setTypingUsers] = useState([]);
	const [documentTitle, setDocumentTitle] = useState("Untitled Document");
	const [onlineUsers, setOnlineUsers] = useState([]);
	const [chatMessages, setChatMessages] = useState([]);
	const [remoteCursors, setRemoteCursors] = useState([]);
	const [documentRestoreTick, setDocumentRestoreTick] = useState(0);

	const startRetryCountdown = (seconds) => {
		if (retryCountdownRef.current) {
			clearInterval(retryCountdownRef.current);
		}
		setRetryIn(seconds);
		retryCountdownRef.current = setInterval(() => {
			setRetryIn((prev) => {
				if (prev <= 1) {
					if (retryCountdownRef.current) {
						clearInterval(retryCountdownRef.current);
						retryCountdownRef.current = null;
					}
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	useEffect(() => {
		const socket = createSocketClient();
		socketRef.current = socket;
		setConnectionStatus("connecting");
		setConnectionMessage("Connecting...");

		wakeupTimerRef.current = setTimeout(() => {
			if (!socket.connected) {
				setConnectionStatus("waking");
				setConnectionMessage("Waking up server...");
			}
		}, 5000);

		const debouncedTitleEmit = debounce((title) => {
			if (!socket.connected) {
				return;
			}
			socket.emit("title-change", {
				roomId: documentId,
				title,
				updatedBy: currentUser.name
			});
		}, 500);
		titleEmitRef.current = debouncedTitleEmit;

		// Create debounced emit for Yjs updates (250ms debounce)
		const debouncedEmitUpdate = debounce(
			(update) => {
				if (!socket.connected) {
					setSaveStatus("error");
					return;
				}
				setSaveStatus("saving");
				socket.emit("yjs-update", { 
					documentId, 
					update: Array.from(update),
					timestamp: Date.now()
				}, (response) => {
					if (response?.ok) {
						setSaveStatus("saved");
						setTimeout(() => {
							setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
						}, 1200);
						return;
					}
					setSaveStatus("error");
				});
			},
			250,
			{ maxWait: 1000 }
		);

		const handleLocalYjsUpdate = (update, origin) => {
			if (origin === "remote") {
				return;
			}
			debouncedEmitUpdate(update);
		};

		const handleRemoteYjsUpdate = (update) => {
			try {
				const payload = update instanceof Uint8Array ? update : new Uint8Array(update);
				Y.applyUpdate(ydoc, payload, "remote");
			} catch {
				setConnectionMessage("Sync error. Reconnecting...");
			}
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
			try {
				const payload = update instanceof Uint8Array ? update : new Uint8Array(update);
				applyAwarenessUpdate(awareness, payload, "remote");
				pushAwarenessList();
			} catch {
				setConnectionMessage("Presence sync error");
			}
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
			setConnectionStatus("offline");
			setConnectionMessage("Offline");
			setSaveStatus((prev) => (prev === "saving" ? "error" : prev));
			if (latencyIntervalRef.current) {
				clearInterval(latencyIntervalRef.current);
				latencyIntervalRef.current = null;
			}
		};

		const handleConnectError = () => {
			setConnectionStatus("waking");
			setConnectionMessage("Waking up server (30-60s)...");
		};

		const handleReconnectAttempt = (nextAttempt) => {
			setConnectionStatus("connecting");
			setAttempt(nextAttempt || 0);
			setConnectionMessage(`Reconnecting... (${nextAttempt || 0}/15)`);
			startRetryCountdown(2);
		};

		const handleReconnectFailed = () => {
			setConnectionStatus("offline");
			setConnectionMessage("Connection failed. Click to retry.");
		};

		const handleDocumentRestored = () => {
			setDocumentRestoreTick((prev) => prev + 1);
		};

		const handleTypingStart = ({ userId, username }) => {
			if (!userId || !username) {
				return;
			}
			setTypingUsers((prev) => {
				if (prev.some((entry) => entry.userId === userId)) {
					return prev;
				}
				return [...prev, { userId, username }];
			});
		};

		const handleTypingStop = ({ userId }) => {
			if (!userId) {
				return;
			}
			setTypingUsers((prev) => prev.filter((entry) => entry.userId !== userId));
		};

		const handleChatHistory = (history) => {
			setChatMessages(Array.isArray(history) ? history : []);
		};

		const handleNewMessage = (message) => {
			if (!message?.id) {
				return;
			}
			setChatMessages((prev) => {
				const hasMessage = prev.some((entry) => String(entry.id) === String(message.id));
				if (hasMessage) {
					return prev;
				}
				const next = [...prev, { ...message, reactions: message.reactions || [] }];
				return next.length > 50 ? next.slice(-50) : next;
			});
		};

		const handleReactionUpdated = ({ messageId, reactions }) => {
			if (!messageId) {
				return;
			}
			setChatMessages((prev) =>
				prev.map((message) =>
					String(message.id) === String(messageId)
						? { ...message, reactions: Array.isArray(reactions) ? reactions : [] }
						: message
				)
			);
		};

		const handleCursorUpdate = (payload) => {
			if (!payload?.userId) {
				return;
			}
			setRemoteCursors((prev) => {
				const filtered = prev.filter((entry) => entry.userId !== payload.userId);
				return [...filtered, payload].slice(-50);
			});
		};

		const handleTitleUpdated = ({ title }) => {
			const nextTitle = title || "Untitled Document";
			setDocumentTitle(nextTitle);
			document.title = `${nextTitle} - CollabEditor`;
		};

		socket.on("connect", () => {
			socket.emit("join-document", {
				documentId,
				roomId: documentId,
				userId: currentUser.id,
				username: currentUser.name,
				color: currentUser.color,
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
			setConnectionStatus("connected");
			setConnectionMessage("Live");
			setRetryIn(0);
			setAttempt(0);

			if (latencyIntervalRef.current) {
				clearInterval(latencyIntervalRef.current);
			}
			latencyIntervalRef.current = setInterval(() => {
				const start = Date.now();
				socket.emit("ping-latency", () => {
					setLatency(Date.now() - start);
				});
			}, 10000);

			if (retryCountdownRef.current) {
				clearInterval(retryCountdownRef.current);
				retryCountdownRef.current = null;
			}
			if (wakeupTimerRef.current) {
				clearTimeout(wakeupTimerRef.current);
				wakeupTimerRef.current = null;
			}
		});
		socket.on("disconnect", handleDisconnect);
		socket.on("connect_error", handleConnectError);
		socket.io.on("reconnect_attempt", handleReconnectAttempt);
		socket.io.on("reconnect_failed", handleReconnectFailed);
		socket.on("document-restored", handleDocumentRestored);
		socket.on("user-typing", handleTypingStart);
		socket.on("user-stopped-typing", handleTypingStop);
		socket.on("user-stopped", handleTypingStop);
		socket.on("title-updated", handleTitleUpdated);
		socket.on("chat-history", handleChatHistory);
		socket.on("new-message", handleNewMessage);
		socket.on("receive-message", handleNewMessage);
		socket.on("message-reaction-updated", handleReactionUpdated);
		socket.on("cursor-update", handleCursorUpdate);

		socket.on("document-state", handleRemoteYjsUpdate);
		socket.on("yjs-update", handleRemoteYjsUpdate);
		socket.on("awareness-update", handleRemoteAwarenessUpdate);
		socket.on("presence-state", handlePresenceState);

		ydoc.on("update", handleLocalYjsUpdate);
		awareness.on("update", handleLocalAwarenessUpdate);

		const handleBeforeUnload = () => {
			if (socket.connected) {
				socket.emit("user-leave", {
					userId: currentUser.id,
					roomId: documentId
				});
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			awareness.off("update", handleLocalAwarenessUpdate);
			ydoc.off("update", handleLocalYjsUpdate);
			awareness.setLocalState(null);
			socket.off("disconnect", handleDisconnect);
			socket.off("connect_error", handleConnectError);
			socket.io.off("reconnect_attempt", handleReconnectAttempt);
			socket.io.off("reconnect_failed", handleReconnectFailed);
			socket.off("document-restored", handleDocumentRestored);
			socket.off("user-typing", handleTypingStart);
			socket.off("user-stopped-typing", handleTypingStop);
			socket.off("user-stopped", handleTypingStop);
			socket.off("title-updated", handleTitleUpdated);
			socket.off("chat-history", handleChatHistory);
			socket.off("new-message", handleNewMessage);
			socket.off("receive-message", handleNewMessage);
			socket.off("message-reaction-updated", handleReactionUpdated);
			socket.off("cursor-update", handleCursorUpdate);
			socket.disconnect();
			socketRef.current = null;
			debouncedEmitUpdate.cancel();
			debouncedTitleEmit.cancel();
			if (typingStopTimerRef.current) {
				clearTimeout(typingStopTimerRef.current);
				typingStopTimerRef.current = null;
			}
			if (retryCountdownRef.current) {
				clearInterval(retryCountdownRef.current);
				retryCountdownRef.current = null;
			}
			if (wakeupTimerRef.current) {
				clearTimeout(wakeupTimerRef.current);
				wakeupTimerRef.current = null;
			}
			if (latencyIntervalRef.current) {
				clearInterval(latencyIntervalRef.current);
				latencyIntervalRef.current = null;
			}
		};
	}, [awareness, currentUser, documentId, ydoc]);

	/**
	 * Signals typing state to collaborators with a 2-second inactivity timeout.
	 * @returns {void}
	 */
	function notifyTyping() {
		if (!socketRef.current?.connected) {
			return;
		}

		socketRef.current.emit("typing-start", {
			roomId: documentId,
			userId: currentUser.id,
			username: currentUser.name
		});

		if (typingStopTimerRef.current) {
			clearTimeout(typingStopTimerRef.current);
		}

		typingStopTimerRef.current = setTimeout(() => {
			socketRef.current?.emit("typing-stop", {
				roomId: documentId,
				userId: currentUser.id
			});
		}, 2000);
	}

	/**
	 * Updates title locally and syncs with collaborators.
	 * @param {string} nextTitle - New document title.
	 * @returns {void}
	 */
	function updateDocumentTitle(nextTitle) {
		const title = nextTitle ?? "";
		setDocumentTitle(title);
		document.title = `${title || "Untitled Document"} - CollabEditor`;
		titleEmitRef.current(title);
	}

	/**
	 * Manually retries socket connection.
	 * @returns {void}
	 */
	function retryConnection() {
		if (!socketRef.current) {
			return;
		}
		setConnectionStatus("connecting");
		setConnectionMessage("Retrying...");
		socketRef.current.connect();
	}

	/**
	 * Broadcasts updated user identity to current room.
	 * @param {{ id: string, name: string, color: string }} user - Updated user identity.
	 * @returns {void}
	 */
	function renameUser(user) {
		if (!socketRef.current?.connected || !user?.name) {
			return;
		}

		awareness.setLocalStateField("user", {
			name: user.name,
			color: user.color
		});

		socketRef.current.emit("user-rename", {
			roomId: documentId,
			userId: user.id,
			username: user.name,
			color: user.color
		});
	}

	/**
	 * Emits a chat message to the current room.
	 * @param {string} message - Chat message text.
	 * @returns {void}
	 */
	function sendChatMessage(message) {
		if (!socketRef.current?.connected) {
			return;
		}

		socketRef.current.emit("send-message", {
			message,
			roomId: documentId,
			userId: currentUser.id,
			username: currentUser.name,
			color: currentUser.color
		});
	}

	/**
	 * Emits message reaction update for a chat message.
	 * @param {string} messageId - Target message identifier.
	 * @param {string} emoji - Emoji reaction token.
	 * @returns {void}
	 */
	function reactToMessage(messageId, emoji) {
		if (!socketRef.current?.connected || !messageId || !emoji) {
			return;
		}

		socketRef.current.emit("message-reaction", {
			roomId: documentId,
			messageId,
			emoji,
			userId: currentUser.id,
			username: currentUser.name
		});
	}

	/**
	 * Emits cursor position updates for remote awareness labels.
	 * @param {number} position - Current cursor position.
	 * @returns {void}
	 */
	function reportCursorMove(position) {
		if (!socketRef.current?.connected || typeof position !== "number") {
			return;
		}

		socketRef.current.emit("cursor-move", {
			roomId: documentId,
			userId: currentUser.id,
			username: currentUser.name,
			color: currentUser.color,
			position
		});
	}

	/**
	 * Stores the current text selection in awareness so collaboration cursors render.
	 * @param {{ from: number, to: number }} selection - Current editor selection.
	 * @returns {void}
	 */
	function updateCursorSelection(selection) {
		if (!selection || typeof selection.from !== "number" || typeof selection.to !== "number") {
			return;
		}

		awareness.setLocalStateField("cursor", {
			anchor: selection.from,
			head: selection.to
		});
	}

	/**
	 * Force-saves current Yjs document state through socket ack.
	 * @returns {Promise<boolean>}
	 */
	async function forceSave() {
		if (!socketRef.current?.connected) {
			setSaveStatus("error");
			return false;
		}

		setSaveStatus("saving");
		const update = Y.encodeStateAsUpdate(ydoc);

		return new Promise((resolve) => {
			socketRef.current.emit(
				"yjs-update",
				{
					documentId,
					update: Array.from(update),
					timestamp: Date.now()
				},
				(response) => {
					if (response?.ok) {
						setSaveStatus("saved");
						resolve(true);
						return;
					}
					setSaveStatus("error");
					resolve(false);
				}
			);
		});
	}

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
		connectionStatus,
		connectionMessage,
		retryIn,
		attempt,
		latency,
		saveStatus,
		typingUsers,
		documentTitle,
		onlineUsers,
		chatMessages,
		remoteCursors,
		documentRestoreTick,
		notifyTyping,
		updateDocumentTitle,
		retryConnection,
		renameUser,
		sendChatMessage,
		reactToMessage,
		reportCursorMove,
		forceSave,
		requestRevisionRestore,
		updateCursorSelection
	};
}
