import {
	Bold,
	Italic,
	Underline,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Quote,
	Undo2,
	Redo2
} from "lucide-react";

/**
 * Renders editor formatting controls.
 * @param {{ editor: import("@tiptap/react").Editor | null, ready: boolean }} props - Toolbar props.
 * @returns {JSX.Element}
 */
export default function Toolbar({ editor, ready }) {
	const disabled = !editor || !ready;

	const actionClass = (active) =>
		active
			? "toolbar-icon-btn active dark:text-blue-300"
			: "toolbar-icon-btn dark:text-gray-300 dark:hover:bg-gray-700";

	return (
		<div className="toolbar overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
			<div className="toolbar-group" role="group" aria-label="Formatting options">
				<button
					type="button"
					className={actionClass(editor?.isActive("bold"))}
					onClick={() => editor?.chain().focus().toggleBold().run()}
					disabled={disabled}
					title="Bold"
				>
					<Bold size={16} />
				</button>
				<button
					type="button"
					className={actionClass(editor?.isActive("italic"))}
					onClick={() => editor?.chain().focus().toggleItalic().run()}
					disabled={disabled}
					title="Italic"
				>
					<Italic size={16} />
				</button>
				<button
					type="button"
					className={actionClass(editor?.isActive("underline"))}
					onClick={() => editor?.chain().focus().toggleUnderline().run()}
					disabled={disabled}
					title="Underline"
				>
					<Underline size={16} />
				</button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="Heading options">
				<button
					type="button"
					className={actionClass(editor?.isActive("heading", { level: 1 }))}
					onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
					disabled={disabled}
					title="Heading 1"
				>
					<Heading1 size={16} />
				</button>
				<button
					type="button"
					className={actionClass(editor?.isActive("heading", { level: 2 }))}
					onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					disabled={disabled}
					title="Heading 2"
				>
					<Heading2 size={16} />
				</button>
				<button
					type="button"
					className={actionClass(editor?.isActive("heading", { level: 3 }))}
					onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
					disabled={disabled}
					title="Heading 3"
				>
					<Heading3 size={16} />
				</button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="List and quote options">
				<button
					type="button"
					className={actionClass(editor?.isActive("bulletList"))}
					onClick={() => editor?.chain().focus().toggleBulletList().run()}
					disabled={disabled}
					title="Bullet list"
				>
					<List size={16} />
				</button>
				<button
					type="button"
					className={actionClass(editor?.isActive("orderedList"))}
					onClick={() => editor?.chain().focus().toggleOrderedList().run()}
					disabled={disabled}
					title="Numbered list"
				>
					<ListOrdered size={16} />
				</button>
				<button
					type="button"
					className={actionClass(editor?.isActive("blockquote"))}
					onClick={() => editor?.chain().focus().toggleBlockquote().run()}
					disabled={disabled}
					title="Blockquote"
				>
					<Quote size={16} />
				</button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="History options">
				<button
					type="button"
					className="toolbar-icon-btn"
					onClick={() => editor?.chain().focus().undo().run()}
					disabled={disabled || !editor?.can().undo()}
					title="Undo"
				>
					<Undo2 size={16} />
				</button>
				<button
					type="button"
					className="toolbar-icon-btn"
					onClick={() => editor?.chain().focus().redo().run()}
					disabled={disabled || !editor?.can().redo()}
					title="Redo"
				>
					<Redo2 size={16} />
				</button>
			</div>
		</div>
	);
}
