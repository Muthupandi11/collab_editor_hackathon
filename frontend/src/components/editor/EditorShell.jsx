import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Toolbar from "./Toolbar.jsx";

/**
 * Renders the collaborative TipTap editor and formatting toolbar.
 * @param {{ ydoc: import("yjs").Doc, awareness: import("y-protocols/awareness").Awareness, currentUser: { name: string, color: string }, ready: boolean, onTyping?: () => void, onTextStatsChange?: (payload: { words: number, characters: number }) => void }} props - Editor props.
 * @returns {JSX.Element}
 */
export default function EditorShell({ ydoc, awareness, currentUser, ready, onTyping, onTextStatsChange }) {
	const editor = useEditor({
		editorProps: {
			attributes: {
				class: "editor-content"
			}
		},
		onUpdate: ({ editor: current }) => {
			onTyping?.();
			const text = current.getText() || "";
			const words = text.trim().length > 0 ? text.trim().split(/\s+/).filter(Boolean).length : 0;
			onTextStatsChange?.({ words, characters: text.length });
		},
		extensions: [
			StarterKit.configure({ history: false }),
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

	return (
		<>
			<Toolbar editor={editor} ready={ready} />
			<div className="editor-card">
				<EditorContent editor={editor} />
			</div>
		</>
	);
}
