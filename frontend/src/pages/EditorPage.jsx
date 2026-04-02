import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorShell from "../components/editor/EditorShell.jsx";
import RevisionHistory from "../components/editor/RevisionHistory.jsx";
import PresenceList from "../components/presence/PresenceList.jsx";
import { useCollaboration } from "../hooks/useCollaboration.js";
import { fetchRevisions, restoreRevision, saveRevision } from "../services/revisionService.js";
import { toast } from "../lib/toast.js";
import LeftSidebar from "../components/sidebar/LeftSidebar.jsx";
import ChatPanel from "../components/sidebar/ChatPanel.jsx";
import EditorHeader from "../components/layout/EditorHeader.jsx";
import StatusBar from "../components/layout/StatusBar.jsx";
import ImportModal from "../components/editor/ImportModal.jsx";
import { getBackendBaseUrl } from "../services/backendUrl.js";

const BACKEND_URL = getBackendBaseUrl();

/**
 * Document editor page.
 * @param {{ documentId: string, currentUser: { id: string, name: string, color: string, soundEnabled?: boolean }, onRequestIdentityEdit: () => void, onToggleSound: () => void }} props - Page props.
 * @returns {JSX.Element}
 */
export default function EditorPage({ documentId, currentUser, onRequestIdentityEdit, onToggleSound }) {
	const {
		ydoc,
		awareness,
		ready,
		onlineUsers,
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
		reactToMessage,
		remoteCursors,
		reportCursorMove,
		forceSave
	} = useCollaboration({ documentId, currentUser });

	const editorRef = useRef(null);
	const hasUnsavedChanges = useRef(false);
	const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [showImportModal, setShowImportModal] = useState(false);
	const [sections, setSections] = useState({ users: true, history: true, chat: false });
	const [title, setTitle] = useState(documentTitle);
	const [editorText, setEditorText] = useState("");
	const [textStats, setTextStats] = useState({ words: 0, characters: 0, lines: 1 });
	const [revisions, setRevisions] = useState([]);
	const [loadingRevisions, setLoadingRevisions] = useState(true);
	const [revisionError, setRevisionError] = useState("");
	const [restoringId, setRestoringId] = useState(null);
	const [loadingDocument, setLoadingDocument] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState(null);

	const parseJsonSafely = async (response, url) => {
		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			const text = await response.text();
			throw new Error(`Server returned HTML. Status: ${response.status}. URL: ${url}. Snippet: ${text.slice(0, 40)}`);
		}
		return response.json();
	};

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

	const saveDocument = useCallback(async () => {
		if (!editorRef.current || !documentId) {
			return false;
		}

		const content = editorRef.current.getHTML();
		if (!content || !content.trim()) {
			return false;
		}

		try {
			const saveUrl = `${BACKEND_URL}/api/documents/${documentId}`;
			const response = await fetch(saveUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					content,
					title: title || "Untitled Document",
					roomId: documentId,
					updatedBy: currentUser.name,
					createdBy: currentUser.name
				})
			});

			if (!response.ok) {
				throw new Error(`Document save failed: HTTP ${response.status}`);
			}
			await parseJsonSafely(response, saveUrl);

			await saveRevision(documentId, content, currentUser.name);
			hasUnsavedChanges.current = false;
			setLastSavedAt(new Date().toISOString());
			await loadRevisions();
			return true;
		} catch (error) {
			toast.error(`Save failed: ${error.message}`);
			return false;
		}
	}, [currentUser.name, documentId, loadRevisions, title]);

	const loadDocument = useCallback(async () => {
		if (!documentId || !editorRef.current) {
			return;
		}

		setLoadingDocument(true);
		try {
			const url = `${BACKEND_URL}/api/documents/${documentId}`;
			const response = await fetch(url, {
				credentials: "include",
				headers: { Accept: "application/json" }
			});

			if (!response.ok) {
				throw new Error(`Load failed: HTTP ${response.status}`);
			}

			const payload = await parseJsonSafely(response, url);
			const content = payload?.content || payload?.document?.content || "";
			const savedTitle = payload?.title || payload?.document?.title || "Untitled Document";

			if (content) {
				editorRef.current.commands.setContent(content, false);
				hasUnsavedChanges.current = false;
			}
			setTitle(savedTitle);
			updateDocumentTitle(savedTitle);
		} catch (error) {
			toast.error(`Load failed: ${error.message}`);
		} finally {
			setLoadingDocument(false);
		}
	}, [documentId, updateDocumentTitle]);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", darkMode);
	}, [darkMode]);

	useEffect(() => {
		setTitle(documentTitle);
	}, [documentTitle]);

	useEffect(() => {
		const userCount = onlineUsers.length;
		const docTitle = title || "Untitled Document";
		document.title = userCount > 1
			? `${docTitle} (${userCount} online) — CollabEditor`
			: `${currentUser.name}'s ${docTitle} — CollabEditor`;
	}, [currentUser.name, onlineUsers.length, title]);

	useEffect(() => {
		loadRevisions();
	}, [loadRevisions]);

	useEffect(() => {
		if (!sections.history) {
			return;
		}
		const timer = setInterval(() => {
			loadRevisions();
		}, 60000);
		return () => clearInterval(timer);
	}, [loadRevisions, sections.history]);

	useEffect(() => {
		if (ready && editorRef.current) {
			loadDocument();
		}
	}, [loadDocument, ready]);

	useEffect(() => {
		const interval = setInterval(async () => {
			if (hasUnsavedChanges.current) {
				await saveDocument();
			}
		}, 30000);
		return () => clearInterval(interval);
	}, [saveDocument]);

	useEffect(() => {
		if (!ready) {
			return;
		}

		const timer = setTimeout(async () => {
			if (hasUnsavedChanges.current) {
				await saveDocument();
			}
		}, 3000);

		return () => clearTimeout(timer);
	}, [editorText, ready, saveDocument]);

	useEffect(() => {
		const handler = async (event) => {
			const ctrlOrCmd = event.ctrlKey || event.metaKey;
			if (ctrlOrCmd && event.key.toLowerCase() === "s") {
				event.preventDefault();
				const ok = await saveDocument();
				if (ok) {
					toast.success("Document saved!");
					loadRevisions();
				}
			}
			if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === "c") {
				event.preventDefault();
				handleShare();
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [loadRevisions, saveDocument]);

	const handleRestore = useCallback(
		async (revisionId) => {
			if (!window.confirm("Replace current content with this version?")) {
				return;
			}

			setRestoringId(revisionId);
			setRevisionError("");
			try {
				await saveDocument();
				const restored = await restoreRevision(documentId, revisionId);
				if (restored?.content) {
					editorRef.current?.commands.setContent(restored.content, false);
					hasUnsavedChanges.current = true;
					await forceSave();
					await saveDocument();
				}
				toast.success("Restored to selected version");
				await loadRevisions();
			} catch (error) {
				setRevisionError(error.message || "Restore failed.");
				toast.error(`Restore failed: ${error.message}`);
			} finally {
				setRestoringId(null);
			}
		},
		[documentId, forceSave, loadRevisions, saveDocument]
	);

	const handleImportContent = useCallback(
		async ({ html, source }) => {
			if (!editorRef.current) {
				throw new Error("Editor not ready");
			}
			await saveDocument();
			editorRef.current.commands.setContent(html || "<p></p>", false);
			hasUnsavedChanges.current = true;
			await forceSave();
			await saveDocument();
			toast.success(`${source} imported and synced to all users`);
		},
		[forceSave, saveDocument]
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
				? "Saved"
				: saveStatus === "error"
					? "Save failed"
					: "";

	const isOffline = connectionStatus === "offline";

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
		const html = editorRef.current.getHTML();
		const plainText = editorRef.current.getText();
		if (type === "txt") {
			downloadBlob(new Blob([plainText], { type: "text/plain" }), `${base}.txt`);
		}
		if (type === "json") {
			const payload = JSON.stringify(
				{
					title: title || "Untitled Document",
					roomId: documentId,
					text: plainText,
					html,
					exportedAt: new Date().toISOString()
				},
				null,
				2
			);
			downloadBlob(new Blob([payload], { type: "application/json" }), `${base}.json`);
		}
		if (type === "html") {
			const fullHtml = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>${base}</title></head><body>${html}</body></html>`;
			downloadBlob(new Blob([fullHtml], { type: "text/html" }), `${base}.html`);
		}
		if (type === "md") {
			const markdown = plainText.replace(/\n{2,}/g, "\n\n");
			downloadBlob(new Blob([markdown], { type: "text/markdown" }), `${base}.md`);
		}
		if (type === "word") {
			const wordDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
			downloadBlob(new Blob([wordDoc], { type: "application/msword" }), `${base}.doc`);
		}
		if (type === "pdf") {
			const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
			if (!printWindow) {
				toast.error("Popup blocked. Allow popups to export PDF.");
				setShowExportMenu(false);
				return;
			}
			printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${base}</title><style>body{font-family:Inter,Arial,sans-serif;padding:32px;line-height:1.6;} h1,h2,h3{margin-top:1.2em;} p{margin:0.6em 0;} ul,ol{margin:0.6em 0 0.8em 1.2em;}</style></head><body>${html}</body></html>`);
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
		}
		if (type === "gdocs") {
			navigator.clipboard
				.writeText(plainText)
				.then(() => {
					window.open("https://docs.new", "_blank", "noopener,noreferrer");
					toast.info("Google Docs opened. Paste with Ctrl+V.");
				})
				.catch(() => {
					window.open("https://docs.new", "_blank", "noopener,noreferrer");
					toast.info("Google Docs opened. Copy content manually.");
				});
		}
		setShowExportMenu(false);
	};

	const handleShare = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			toast.success("Room link copied!");
		} catch (error) {
			toast.error(`Copy failed: ${error.message}`);
		}
	};

	const toggleSection = (key) => {
		setSections((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const playNotification = () => {
		try {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			if (!AudioContextClass) {
				return;
			}
			const ctx = new AudioContextClass();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = 800;
			gain.gain.setValueAtTime(0.1, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
			osc.start(ctx.currentTime);
			osc.stop(ctx.currentTime + 0.3);
		} catch {
			// Ignore audio initialization failures.
		}
	};

	return (
		<>
			<EditorHeader
				title={title}
				onTitleChange={(value) => {
					setTitle(value);
					updateDocumentTitle(value);
					hasUnsavedChanges.current = true;
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
				onImport={() => setShowImportModal(true)}
				onExport={() => setShowExportMenu((prev) => !prev)}
				connectionBadge={connectionBadge}
				currentUser={currentUser}
				onRequestIdentityEdit={onRequestIdentityEdit}
				soundEnabled={currentUser.soundEnabled !== false}
				onToggleSound={onToggleSound}
			/>
			{showExportMenu ? (
				<div className="export-menu">
					<button type="button" onClick={() => exportDocument("txt")}>Export as TXT</button>
					<button type="button" onClick={() => exportDocument("json")}>Export as JSON</button>
					<button type="button" onClick={() => exportDocument("html")}>Export as HTML</button>
					<button type="button" onClick={() => exportDocument("md")}>Export as Markdown</button>
					<button type="button" onClick={() => exportDocument("word")}>Export as Word</button>
					<button type="button" onClick={() => exportDocument("pdf")}>Export as PDF</button>
					<button type="button" onClick={() => exportDocument("gdocs")}>Open in Google Docs</button>
				</div>
			) : null}
			<ImportModal
				open={showImportModal}
				backendUrl={BACKEND_URL}
				onClose={() => setShowImportModal(false)}
				onImport={handleImportContent}
			/>

			<div className="premium-layout">
				<LeftSidebar
					stats={{
						revisions: revisions.length,
						users: onlineUsers.length,
						updatedText: lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "Not saved yet"
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
							hasUnsavedChanges.current = true;
						}
					}}
				/>

				<section className="min-w-0 main-editor-column">
					<EditorShell
						ydoc={ydoc}
						awareness={awareness}
						currentUser={currentUser}
						ready={ready}
						onTyping={notifyTyping}
						onTextStatsChange={setTextStats}
						onPlainTextChange={(text) => {
							setEditorText(text);
							hasUnsavedChanges.current = true;
						}}
						onEditorReady={(editor) => {
							editorRef.current = editor;
						}}
						onSelectionChange={reportCursorMove}
					/>

					<div className="word-count-bar">
						<span className="min-w-[140px]">
							{textStats.words} words · {textStats.characters} characters · {textStats.lines} lines
						</span>
						<span className="flex-1 text-center">{typingLabel || ""}</span>
						<span className="min-w-[180px] text-right text-green-600 dark:text-green-400">
							{loadingDocument ? "Loading..." : saveLabel}
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
								onRefresh={async () => {
									retryConnection();
									toast.info("Reconnecting...");
									await loadRevisions();
								}}
								onRestore={handleRestore}
							/>
						) : null}
					</section>
					<ChatPanel
						messages={chatMessages}
						currentUserId={currentUser.id}
						onSend={sendChatMessage}
						onReact={reactToMessage}
						collapsed={!sections.chat}
						onToggle={() => toggleSection("chat")}
						isConnected={connectionStatus === "connected"}
						onReconnect={retryConnection}
						soundEnabled={currentUser.soundEnabled !== false}
						onPlayNotification={playNotification}
						onlineUsersCount={onlineUsers.length}
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
