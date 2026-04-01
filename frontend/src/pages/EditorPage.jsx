import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorShell from "../components/editor/EditorShell.jsx";
import RevisionHistory from "../components/editor/RevisionHistory.jsx";
import PresenceList from "../components/presence/PresenceList.jsx";
import { useCollaboration } from "../hooks/useCollaboration.js";
import { fetchRevisions } from "../services/revisionService.js";
import { toast } from "../lib/toast.js";
import LeftSidebar from "../components/sidebar/LeftSidebar.jsx";
import ChatPanel from "../components/sidebar/ChatPanel.jsx";
import EditorHeader from "../components/layout/EditorHeader.jsx";
import StatusBar from "../components/layout/StatusBar.jsx";

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
		retryConnection,
		chatMessages,
		sendChatMessage,
		remoteCursors,
		reportCursorMove,
		forceSave
	} = useCollaboration({
		documentId,
		currentUser
	});
	const editorRef = useRef(null);
	const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [sections, setSections] = useState({ users: true, history: true, chat: false });
	const [title, setTitle] = useState(documentTitle);
	const [editorText, setEditorText] = useState("");
	const [draftToApply, setDraftToApply] = useState(null);
	const [draftPrompted, setDraftPrompted] = useState(false);
	const [textStats, setTextStats] = useState({ words: 0, characters: 0, lines: 1 });
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
		document.documentElement.classList.toggle("dark", darkMode);
	}, [darkMode]);

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

	const connectionBadge =
		connectionStatus === "connected" ? (
			<div className="badge-connected"><span className="dot pulse" />Live</div>
		) : connectionStatus === "waking" ? (
			<div className="badge-waking"><span className="dot bounce" />Waking up...</div>
		) : connectionStatus === "connecting" ? (
			<div className="badge-connecting"><span className="ring" />{connectionMessage}{retryIn > 0 ? ` (${retryIn}s)` : ""}</div>
		) : (
			<div className="badge-offline"><span className="dot" />Offline <button type="button" onClick={retryConnection}>Retry</button></div>
		);

	const downloadBlob = (blob, filename) => {
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = filename;
		anchor.click();
		URL.revokeObjectURL(url);
		toast.success(`Exported as ${filename}`);
	};

	const exportDocument = (type) => {
		if (!editorRef.current) {
			return;
		}

		const base = (title || "document").trim() || "document";
		if (type === "txt") {
			downloadBlob(new Blob([editorRef.current.getText()], { type: "text/plain" }), `${base}.txt`);
		}
		if (type === "html") {
			const html = editorRef.current.getHTML();
			const fullHtml = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>${base}</title></head><body>${html}</body></html>`;
			downloadBlob(new Blob([fullHtml], { type: "text/html" }), `${base}.html`);
		}
		if (type === "md") {
			const markdown = editorRef.current.getText().replace(/\n{2,}/g, "\n\n");
			downloadBlob(new Blob([markdown], { type: "text/markdown" }), `${base}.md`);
		}
		setShowExportMenu(false);
	};

	const handleShare = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			toast.success("Room link copied!");
		} catch (error) {
			console.error("Failed to copy room link", error);
			toast.error("Copy failed");
		}
	};

	const toggleSection = (key) => {
		setSections((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	useEffect(() => {
		const handler = async (event) => {
			const ctrlOrCmd = event.ctrlKey || event.metaKey;
			if (ctrlOrCmd && event.key.toLowerCase() === "s") {
				event.preventDefault();
				const ok = await forceSave();
				if (ok) {
					toast.success("Saved!");
				}
			}
			if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === "c") {
				event.preventDefault();
				handleShare();
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [forceSave]);

	return (
		<>
			<EditorHeader
				title={title}
				onTitleChange={(value) => {
					setTitle(value);
					updateDocumentTitle(value);
				}}
				users={onlineUsers}
				roomId={documentId}
				darkMode={darkMode}
				onToggleTheme={() => {
					const next = !darkMode;
					setDarkMode(next);
					localStorage.setItem("theme", next ? "dark" : "light");
				}}
				onShare={handleShare}
				onExport={() => setShowExportMenu((prev) => !prev)}
				connectionBadge={connectionBadge}
			/>
			{showExportMenu ? (
				<div className="export-menu">
					<button type="button" onClick={() => exportDocument("txt")}>Export as TXT</button>
					<button type="button" onClick={() => exportDocument("html")}>Export as HTML</button>
					<button type="button" onClick={() => exportDocument("md")}>Export as Markdown</button>
				</div>
			) : null}

			{connectionStatus === "waking" ? (
				<div className="waking-banner">Server is starting up on free hosting. This takes 30-60 seconds. Please wait...</div>
			) : null}

			<div className="premium-layout">
				<LeftSidebar
					stats={{
						revisions: revisions.length,
						users: onlineUsers.length,
						updatedText: revisions[0]?.createdAt ? new Date(revisions[0].createdAt).toLocaleString() : "Just now"
					}}
					onNewRoom={() => {
						const url = new URL(window.location.href);
						url.searchParams.set("room", Math.random().toString(36).slice(2, 10));
						window.location.href = url.toString();
					}}
					onCopyLink={handleShare}
					onClear={() => {
						if (!editorRef.current) {
							return;
						}
						if (window.confirm("Clear the whole document?")) {
							editorRef.current.commands.setContent("<p></p>");
						}
					}}
				/>

			<section className="min-w-0 main-editor-column">
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
				<EditorShell
					ydoc={ydoc}
					awareness={awareness}
					currentUser={currentUser}
					ready={ready}
					onTyping={notifyTyping}
					onTextStatsChange={setTextStats}
					onPlainTextChange={setEditorText}
					onEditorReady={(editor) => {
						editorRef.current = editor;
					}}
					onSelectionChange={reportCursorMove}
					draftToApply={draftToApply}
					onDraftApplied={() => {
						localStorage.removeItem("collab_offline_draft");
						setDraftToApply(null);
						toast.success("Offline draft synced");
					}}
				/>
				<div className="word-count-bar">
					<span className="min-w-[140px]">
						{textStats.words} words · {textStats.characters} characters · {textStats.lines} lines
					</span>
					<span className="flex-1 text-center">{typingLabel || ""}</span>
					<span className="min-w-[180px] text-right text-green-600 dark:text-green-400">
						{saveLabel}
						{latency != null ? <span className={`ml-2 ${latencyTone}`}>{latency}ms</span> : null}
					</span>
				</div>
				{remoteCursors.length > 0 ? (
					<div className="cursor-strip">
						{remoteCursors.slice(-3).map((cursor) => (
							<span key={`${cursor.userId}-${cursor.position}`} style={{ borderColor: cursor.color }}>
								{cursor.username} editing at {cursor.position}
							</span>
						))}
					</div>
				) : null}
			</section>

				<aside className="right-sidebar">
					<section className="side-card">
						<button type="button" className="accordion-header" onClick={() => toggleSection("users")}>Online Now <span>{sections.users ? "▴" : "▾"}</span></button>
						{sections.users ? <PresenceList users={onlineUsers} /> : null}
					</section>
					<section className="side-card">
						<button type="button" className="accordion-header" onClick={() => toggleSection("history")}>History <span>{sections.history ? "▴" : "▾"}</span></button>
						{sections.history ? (
							<RevisionHistory
								revisions={revisions}
								loading={loadingRevisions}
								error={revisionError}
								isOffline={isOffline}
								restoringId={restoringId}
								onRefresh={loadRevisions}
								onRestore={handleRestore}
							/>
						) : null}
					</section>
					<ChatPanel
						messages={chatMessages}
						currentUserId={awareness.clientID}
						onSend={sendChatMessage}
						collapsed={!sections.chat}
						onToggle={() => toggleSection("chat")}
					/>
				</aside>
			</div>

			<StatusBar
				roomId={documentId}
				users={onlineUsers.length}
				words={textStats.words}
				chars={textStats.characters}
				saveLabel={saveLabel}
				latency={latency}
			/>
		</>
	);
}
