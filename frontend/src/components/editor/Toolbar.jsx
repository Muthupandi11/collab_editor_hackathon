/**
 * Renders editor formatting controls.
 * @param {{ editor: import("@tiptap/react").Editor | null, ready: boolean }} props - Toolbar props.
 * @returns {JSX.Element}
 */
export default function Toolbar({ editor, ready }) {
	const disabled = !editor || !ready;

	return (
		<div className="toolbar">
			<div className="toolbar-group" role="group" aria-label="Formatting options">
				<button
					type="button"
					className={editor?.isActive("bold") ? "toolbar-btn active" : "toolbar-btn"}
					onClick={() => editor?.chain().focus().toggleBold().run()}
					disabled={disabled}
				>
					Bold
				</button>
				<button
					type="button"
					className={editor?.isActive("italic") ? "toolbar-btn active" : "toolbar-btn"}
					onClick={() => editor?.chain().focus().toggleItalic().run()}
					disabled={disabled}
				>
					Italic
				</button>
				<button
					type="button"
					className={editor?.isActive("underline") ? "toolbar-btn active" : "toolbar-btn"}
					onClick={() => editor?.chain().focus().toggleUnderline().run()}
					disabled={disabled}
				>
					Underline
				</button>
			</div>
			<span className={ready ? "toolbar-status connected" : "toolbar-status"}>
				<span className="status-dot" />
				{ready ? "Live" : "Connecting"}
			</span>
		</div>
	);
}
