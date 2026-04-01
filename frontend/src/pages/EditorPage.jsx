import { useCallback, useEffect, useMemo, useState } from "react";
import EditorShell from "../components/editor/EditorShell.jsx";
import RevisionHistory from "../components/editor/RevisionHistory.jsx";
import PresenceList from "../components/presence/PresenceList.jsx";
import { useCollaboration } from "../hooks/useCollaboration.js";
import { fetchRevisions } from "../services/apiClient.js";
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
		documentTitle,
		updateDocumentTitle
	} = useCollaboration({
		documentId,
		currentUser
	});
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

	return (
		<div className="editor-grid">
			<section className="editor-panel">
				<div className="editor-title-row">
					<input
						type="text"
						value={documentTitle}
						onChange={(event) => updateDocumentTitle(event.target.value)}
						placeholder="Untitled Document"
						className="title-input"
					/>
					<span className={connectionStatus === "connected" ? "toolbar-status connected" : "toolbar-status"}>
						<span className="status-dot" />
						{connectionStatus === "connected" ? "Live" : connectionStatus === "connecting" ? "Connecting" : "Offline"}
					</span>
				</div>
				<EditorShell
					ydoc={ydoc}
					awareness={awareness}
					currentUser={currentUser}
					ready={ready}
					onTyping={notifyTyping}
					onTextStatsChange={setTextStats}
				/>
				<div className="bottom-bar">
					<span>
						{textStats.words} words · {textStats.characters} characters
					</span>
					<span>{typingLabel || ""}</span>
					<span>
						{saveStatus === "saving" ? "Saving..." : ""}
						{saveStatus === "saved" ? "Saved ✓" : ""}
						{saveStatus === "error" ? "Unsaved changes ⚠" : ""}
					</span>
				</div>
			</section>
			<div className="sidebar-stack">
				<PresenceList users={onlineUsers} />
				<RevisionHistory
					revisions={revisions}
					loading={loadingRevisions}
					error={revisionError}
					restoringId={restoringId}
					onRefresh={loadRevisions}
					onRestore={handleRestore}
				/>
			</div>
		</div>
	);
}
