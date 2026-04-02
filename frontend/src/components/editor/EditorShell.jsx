import { useEffect, useRef } from "react";
import { useMemo, useState } from "react";
import { List, ListOrdered, Quote, Code2, Heading1, Heading2, Heading3, Minus, Bold, Italic } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Strike from "@tiptap/extension-strike";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Toolbar from "./Toolbar.jsx";

const RichTextStyle = Extension.create({
	name: "richTextStyle",
	addGlobalAttributes() {
		return [
			{
				types: ["textStyle"],
				attributes: {
					fontSize: {
						default: null,
						parseHTML: (element) => element.style.fontSize || null,
						renderHTML: (attributes) => (attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {})
					},
					fontFamily: {
						default: null,
						parseHTML: (element) => element.style.fontFamily || null,
						renderHTML: (attributes) => (attributes.fontFamily ? { style: `font-family: ${attributes.fontFamily}` } : {})
					}
				}
			}
		];
	}
});

const slashCommands = [
	{ key: "h1", label: "Heading 1", hint: "/h1", icon: Heading1, run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
	{ key: "h2", label: "Heading 2", hint: "/h2", icon: Heading2, run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
	{ key: "h3", label: "Heading 3", hint: "/h3", icon: Heading3, run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
	{ key: "bullet", label: "Bullet List", hint: "/bullet", icon: List, run: (editor) => editor.chain().focus().toggleBulletList().run() },
	{ key: "numbered", label: "Numbered List", hint: "/numbered", icon: ListOrdered, run: (editor) => editor.chain().focus().toggleOrderedList().run() },
	{ key: "quote", label: "Blockquote", hint: "/quote", icon: Quote, run: (editor) => editor.chain().focus().toggleBlockquote().run() },
	{ key: "code", label: "Code Block", hint: "/code", icon: Code2, run: (editor) => editor.chain().focus().toggleCodeBlock().run() },
	{ key: "divider", label: "Horizontal Rule", hint: "/divider", icon: Minus, run: (editor) => editor.chain().focus().setHorizontalRule().run() },
	{ key: "bold", label: "Bold", hint: "/bold", icon: Bold, run: (editor) => editor.chain().focus().toggleBold().run() },
	{ key: "italic", label: "Italic", hint: "/italic", icon: Italic, run: (editor) => editor.chain().focus().toggleItalic().run() }
];

const templates = [
	{
		id: "meeting",
		emoji: "🗓️",
		name: "Meeting Notes",
		description: "Agenda, attendees, and action items",
		html: "<h1>Meeting Notes</h1><h2>Attendees</h2><ul><li></li></ul><h2>Agenda</h2><ol><li></li></ol><h2>Action Items</h2><ul><li></li></ul>"
	},
	{
		id: "project",
		emoji: "🚀",
		name: "Project Plan",
		description: "Overview, goals, timeline, team",
		html: "<h1>Project Plan</h1><h2>Overview</h2><p></p><h2>Goals</h2><p></p><h2>Timeline</h2><p></p><h2>Team</h2><p></p><h2>Risks</h2><p></p>"
	},
	{
		id: "blog",
		emoji: "✍️",
		name: "Blog Post",
		description: "Introduction, main points, conclusion",
		html: "<h1>Blog Title</h1><h2>Introduction</h2><p></p><h2>Main Points</h2><p></p><h2>Conclusion</h2><p></p>"
	},
	{
		id: "blank",
		emoji: "📄",
		name: "Blank Document",
		description: "Start from scratch",
		html: "<p></p>"
	}
];

/**
 * Renders the collaborative TipTap editor and formatting toolbar.
 * @param {{ ydoc: import("yjs").Doc, awareness: import("y-protocols/awareness").Awareness, currentUser: { name: string, color: string }, ready: boolean, onTyping?: () => void, onTextStatsChange?: (payload: { words: number, characters: number, lines: number }) => void, onPlainTextChange?: (text: string) => void, onEditorReady?: (editor: import("@tiptap/react").Editor | null) => void, onSelectionChange?: (selection: { from: number, to: number }) => void, remoteCursors?: Array<{ userId: string | number, username: string, color: string, position: number }>, draftToApply?: string | null, onDraftApplied?: () => void }} props - Editor props.
 * @returns {JSX.Element}
 */
export default function EditorShell({ ydoc, awareness, currentUser, ready, onTyping, onTextStatsChange, onPlainTextChange, onEditorReady, onSelectionChange, remoteCursors = [], draftToApply, onDraftApplied }) {
	const editorContainerRef = useRef(null);
	const [slashState, setSlashState] = useState({ open: false, query: "", index: 0, top: 0, left: 0 });
	const [templateDismissed, setTemplateDismissed] = useState(false);

	const editor = useEditor({
		editorProps: {
			attributes: {
				class: "editor-content prose-placeholder"
			}
		},
		onUpdate: ({ editor: current }) => {
			onTyping?.();
			const text = current.getText() || "";
			const words = text.trim().length > 0 ? text.trim().split(/\s+/).filter(Boolean).length : 0;
			const lines = Math.max(1, text.split(/\n/).length);
			onTextStatsChange?.({ words, characters: text.length, lines });
			onPlainTextChange?.(text);

			const { from } = current.state.selection;
			const lineText = current.state.doc.textBetween(Math.max(0, from - 40), from, "\n", "\n");
			const match = lineText.match(/\/(\w*)$/);
			if (match) {
				const coords = current.view.coordsAtPos(from);
				setSlashState((prev) => ({
					open: true,
					query: (match[1] || "").toLowerCase(),
					index: 0,
					top: coords.bottom + window.scrollY + 4,
					left: coords.left + window.scrollX
				}));
			} else if (slashState.open) {
				setSlashState((prev) => ({ ...prev, open: false, query: "", index: 0 }));
			}
		},
		onSelectionUpdate: ({ editor: current }) => {
			onSelectionChange?.({
				from: current.state.selection.from,
				to: current.state.selection.to
			});
		},
		extensions: [
			StarterKit.configure({ history: false, strike: false }),
			TextStyle,
			RichTextStyle,
			Color,
			Highlight.configure({ multicolor: true }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Strike,
			Subscript,
			Superscript,
			Underline,
			Collaboration.configure({
				document: ydoc,
				field: "content"
			}),
			CollaborationCursor.configure({
				provider: { awareness },
				user: {
					name: currentUser.name,
					color: currentUser.color
				}
			})
		],
		content: "<p>Start collaborating in real time.</p>"
	});

	const filteredCommands = useMemo(() => {
		if (!slashState.query) {
			return slashCommands;
		}
		return slashCommands.filter((cmd) => cmd.key.includes(slashState.query) || cmd.label.toLowerCase().includes(slashState.query));
	}, [slashState.query]);

	const applySlashCommand = (command) => {
		if (!editor || !command) {
			return;
		}
		const { from } = editor.state.selection;
		const removeFrom = Math.max(0, from - (slashState.query.length + 1));
		editor.chain().focus().deleteRange({ from: removeFrom, to: from }).run();
		command.run(editor);
		setSlashState((prev) => ({ ...prev, open: false, query: "", index: 0 }));
	};

	useEffect(() => {
		onEditorReady?.(editor || null);
	}, [editor, onEditorReady]);

	useEffect(() => {
		if (!editor || !draftToApply) {
			return;
		}

		const escaped = draftToApply
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\n/g, "<br />");
		editor.commands.setContent(`<p>${escaped}</p>`);
		onDraftApplied?.();
	}, [draftToApply, editor, onDraftApplied]);

	const showTemplatePicker = editor && !templateDismissed && editor.isEmpty;

	return (
		<div
			ref={editorContainerRef}
			onKeyDownCapture={(event) => {
				const root = editorContainerRef.current;
				if (!root) {
					return;
				}
				const target = event.target;
				if (!(target instanceof HTMLElement)) {
					return;
				}
				if (!target.closest(".ProseMirror")) {
					event.stopPropagation();
					return;
				}

				if (slashState.open && filteredCommands.length > 0) {
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setSlashState((prev) => ({ ...prev, index: (prev.index + 1) % filteredCommands.length }));
					}
					if (event.key === "ArrowUp") {
						event.preventDefault();
						setSlashState((prev) => ({ ...prev, index: (prev.index - 1 + filteredCommands.length) % filteredCommands.length }));
					}
					if (event.key === "Enter") {
						event.preventDefault();
						applySlashCommand(filteredCommands[slashState.index]);
					}
					if (event.key === "Escape") {
						event.preventDefault();
						setSlashState((prev) => ({ ...prev, open: false, query: "", index: 0 }));
					}
				}
			}}
		>
			<Toolbar editor={editor} ready={ready} />
			<div className="editor-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
				<div className="mx-auto max-w-[800px] border-l border-r border-gray-100 dark:border-gray-700 px-4 relative">
					<EditorContent editor={editor} />
					{editor && remoteCursors.length > 0 ? (
						<div className="remote-cursor-layer" aria-hidden="true">
							{remoteCursors.slice(-6).map((cursor) => {
								try {
									const resolvedPosition = Math.max(1, Math.min(cursor.position || 1, editor.state.doc.content.size));
									const coords = editor.view.coordsAtPos(resolvedPosition);
									const editorRect = editor.view.dom.getBoundingClientRect();
									const left = Math.max(0, coords.left - editorRect.left);
									const top = Math.max(0, coords.top - editorRect.top);

									return (
										<div
											key={`${cursor.userId}-${cursor.position}`}
											className="remote-cursor-marker"
											style={{ left: `${left}px`, top: `${top}px`, borderColor: cursor.color, color: cursor.color }}
										>
											<span className="remote-cursor-line" style={{ backgroundColor: cursor.color }} />
											<span className="remote-cursor-label" style={{ backgroundColor: cursor.color }}>
												{cursor.username}
											</span>
										</div>
									);
								} catch {
									return null;
								}
							})}
						</div>
					) : null}

					{showTemplatePicker ? (
						<div className="template-picker">
							<h3>Start with a template</h3>
							<div className="template-grid">
								{templates.map((template) => (
									<button
										key={template.id}
										type="button"
										className="template-card"
										onClick={() => {
											editor?.commands.setContent(template.html);
											setTemplateDismissed(true);
										}}
									>
										<span className="template-emoji">{template.emoji}</span>
										<strong>{template.name}</strong>
										<small>{template.description}</small>
									</button>
								))}
							</div>
							<button type="button" className="template-dismiss" onClick={() => setTemplateDismissed(true)}>
								Start blank
							</button>
						</div>
					) : null}
				</div>
			</div>

			{slashState.open && filteredCommands.length > 0 ? (
				<div className="slash-menu" style={{ top: `${slashState.top}px`, left: `${slashState.left}px` }}>
					{filteredCommands.slice(0, 6).map((command, index) => {
						const Icon = command.icon;
						return (
							<button
								key={command.key}
								type="button"
								className={index === slashState.index ? "slash-item active" : "slash-item"}
								onClick={() => applySlashCommand(command)}
							>
								<Icon size={16} />
								<span>{command.label}</span>
								<small>{command.hint}</small>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
