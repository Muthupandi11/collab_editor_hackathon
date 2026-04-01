import { useCallback, useEffect, useMemo, useState } from "react";
import EditorShell from "../components/editor/EditorShell.jsx";
import RevisionHistory from "../components/editor/RevisionHistory.jsx";
import PresenceList from "../components/presence/PresenceList.jsx";
import { useCollaboration } from "../hooks/useCollaboration.js";
import { fetchRevisions } from "../services/revisionService.js";
import { toast } from "../lib/toast.js";

/**
 * Document editor page.
 * @param {{ documentId: string, currentUser: { name: string, color: string } }} props - Page props.
 * @returns {JSX.Element}
 */
export default function EditorPage({ documentId, currentUser }) {
	const {
		ydoc,
		awareness,
		ready,
		onlineUsers,
		requestRevisionRestore,
		notifyTyping,
		typingUsers,
		saveStatus,
		connectionStatus,
		connectionMessage,
		retryIn,
		latency,
		documentTitle,
		updateDocumentTitle,
		retryConnection
	} = useCollaboration({
		documentId,
		currentUser
	});
	const [title, setTitle] = useState(documentTitle);
	const [editorText, setEditorText] = useState("");
	const [draftToApply, setDraftToApply] = useState(null);
	const [draftPrompted, setDraftPrompted] = useState(false);
	const [textStats, setTextStats] = useState({ words: 0, characters: 0 });
	const [revisions, setRevisions] = useState([]);
	const [loadingRevisions, setLoadingRevisions] = useState(true);
	const [revisionError, setRevisionError] = useState("");
	const [restoringId, setRestoringId] = useState(null);

	const loadRevisions = useCallback(async () => {
		setLoadingRevisions(true);
		setRevisionError("");
		try {
			const result = await fetchRevisions(documentId);
			setRevisions(result);
		} catch (error) {
			setRevisionError(error.message || "Failed to load revisions.");
			toast.error("Failed to fetch revision history");
		} finally {
			setLoadingRevisions(false);
		}
	}, [documentId]);

	useEffect(() => {
		loadRevisions();
	}, [loadRevisions]);

	useEffect(() => {
		setTitle(documentTitle);
	}, [documentTitle]);

	useEffect(() => {
		const userCount = onlineUsers.length;
		const docTitle = title || "Untitled Document";
		document.title =
			userCount > 1
				? `${docTitle} (${userCount} online) - CollabEditor`
				: `${docTitle} - CollabEditor`;
	}, [onlineUsers.length, title]);

	useEffect(() => {
		if (connectionStatus !== "offline") {
			return;
		}
		if (!editorText.trim()) {
			return;
		}
		localStorage.setItem("collab_offline_draft", editorText);
	}, [connectionStatus, editorText]);

	useEffect(() => {
		if (connectionStatus !== "connected" || draftPrompted) {
			return;
		}

		const offlineDraft = localStorage.getItem("collab_offline_draft");
		if (!offlineDraft || !offlineDraft.trim()) {
			return;
		}

		setDraftPrompted(true);
		const shouldSync = window.confirm("You have unsaved changes. Sync now?");
		if (shouldSync) {
			setDraftToApply(offlineDraft);
			return;
		}
	}, [connectionStatus, draftPrompted]);

	useEffect(() => {
		const timer = setInterval(() => {
			loadRevisions();
		}, 30000);

		return () => {
			clearInterval(timer);
		};
	}, [loadRevisions]);

	const handleRestore = useCallback(
		async (revisionId) => {
			if (!window.confirm("Restore this revision for all collaborators in the room?")) {
				return;
			}

			setRestoringId(revisionId);
			setRevisionError("");
			try {
				await requestRevisionRestore(revisionId);
				toast.success("Document restored");
			} catch (error) {
				setRevisionError(error.message || "Restore failed.");
				setRestoringId(null);
				toast.error("Failed to restore revision");
			}
		},
		[requestRevisionRestore]
	);

	const typingLabel = useMemo(() => {
		if (typingUsers.length === 0) {
			return "";
		}
		if (typingUsers.length === 1) {
			return `${typingUsers[0].username} is typing...`;
		}
		return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`;
	}, [typingUsers]);

	const saveLabel =
		saveStatus === "saving"
			? "Saving..."
			: saveStatus === "saved"
				? "All changes saved ✓"
				: saveStatus === "error"
					? "Unsaved changes ⚠"
					: "";

	const isOffline = connectionStatus === "offline";
	const latencyTone =
		latency == null ? "text-gray-400 dark:text-gray-500" : latency < 100 ? "text-green-500" : latency < 300 ? "text-amber-500" : "text-red-500";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
			<section className="min-w-0">
			{connectionStatus === "waking" ? (
				<div className="w-full bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-700 text-center rounded-lg mb-2">
					Server is waking up on Render free tier - this takes 30-60 seconds. Please wait, connection will establish automatically.
				</div>
			) : null}
			{connectionStatus === "offline" ? (
				<div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700 text-center rounded-lg mb-2">
					You are offline - changes saved locally.
				</div>
			) : null}
				<div className="flex items-center gap-3 mb-3">
					<input
						type="text"
						value={title}
						onChange={(event) => {
							setTitle(event.target.value);
							updateDocumentTitle(event.target.value);
						}}
						onKeyDown={(event) => {
							event.stopPropagation();
						}}
						placeholder="Untitled Document"
						className="title-input w-full px-3 py-2 rounded-lg border bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg placeholder-gray-400 dark:placeholder-gray-500"
					/>
					{connectionStatus === "connected" ? (
						<div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
							<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
							<span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
						</div>
					) : null}
					{connectionStatus === "connecting" ? (
						<div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-800">
							<span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
							<span className="text-xs font-medium text-amber-700 dark:text-amber-400">
								{connectionMessage}
								{retryIn > 0 ? ` Retrying in ${retryIn}s...` : ""}
							</span>
						</div>
					) : null}
					{connectionStatus === "offline" ? (
						<div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/30 rounded-full border border-red-200 dark:border-red-800">
							<span className="w-2 h-2 bg-red-500 rounded-full" />
							<span className="text-xs font-medium text-red-700 dark:text-red-400">Offline</span>
							<button type="button" className="text-xs px-2 py-0.5 rounded border border-red-300 dark:border-red-700" onClick={retryConnection}>
								Retry
							</button>
						</div>
					) : null}
				</div>
				<EditorShell
					ydoc={ydoc}
					awareness={awareness}
					currentUser={currentUser}
					ready={ready}
					onTyping={notifyTyping}
					onTextStatsChange={setTextStats}
					onPlainTextChange={setEditorText}
					draftToApply={draftToApply}
					onDraftApplied={() => {
						localStorage.removeItem("collab_offline_draft");
						setDraftToApply(null);
						toast.success("Offline draft synced");
					}}
				/>
				<div className="flex justify-between items-center px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
					<span className="min-w-[140px]">
						{textStats.words} words · {textStats.characters} characters
					</span>
					<span className="flex-1 text-center">{typingLabel || ""}</span>
					<span className="min-w-[180px] text-right text-green-600 dark:text-green-400">
						{saveLabel}
						{latency != null ? <span className={`ml-2 ${latencyTone}`}>{latency}ms</span> : null}
					</span>
				</div>
			</section>
			<div className="flex flex-col gap-3 lg:sticky lg:top-4 h-fit">
				<PresenceList users={onlineUsers} />
				<RevisionHistory
					revisions={revisions}
					loading={loadingRevisions}
					error={revisionError}
					isOffline={isOffline}
					restoringId={restoringId}
					onRefresh={loadRevisions}
					onRestore={handleRestore}
				/>
			</div>
		</div>
	);
}
