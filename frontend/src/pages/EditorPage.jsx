import { useCallback, useEffect, useState } from "react";
import EditorShell from "../components/editor/EditorShell.jsx";
import RevisionHistory from "../components/editor/RevisionHistory.jsx";
import PresenceList from "../components/presence/PresenceList.jsx";
import { useCollaboration } from "../hooks/useCollaboration.js";
import { fetchRevisions } from "../services/apiClient.js";

/**
 * Document editor page.
 * @param {{ documentId: string, currentUser: { name: string, color: string } }} props - Page props.
 * @returns {JSX.Element}
 */
export default function EditorPage({ documentId, currentUser }) {
	const { ydoc, awareness, ready, onlineUsers, requestRevisionRestore } = useCollaboration({
		documentId,
		currentUser
	});
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
		}, 15000);

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
			} catch (error) {
				setRevisionError(error.message || "Restore failed.");
				setRestoringId(null);
			}
		},
		[requestRevisionRestore]
	);

	return (
		<div className="editor-grid">
			<EditorShell ydoc={ydoc} awareness={awareness} currentUser={currentUser} ready={ready} />
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
