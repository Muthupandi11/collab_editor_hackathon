import React from "react";
import { useEditor } from "@tiptap/react";
import {
	Bold, Italic, Underline,
	Heading1, Heading2, Heading3,
	List, ListOrdered, Quote,
	Undo2, Redo2
} from "lucide-react";

/**
 * Editor toolbar with text formatting controls
 * @param {{ editor: Object }} props
 */
export function Toolbar({ editor }) {
	if (!editor) return null;

	const isActive = (command) => editor?.isActive(command);

	const ButtonGroup = ({ children }) => (
		<div className="flex gap-1 px-2">{children}</div>
	);

	const ToolButton = ({ icon: Icon, label, command, isBlock = false }) => (
		<button
			onClick={() => {
				if (isBlock) {
					editor.chain().focus()[command]().run();
				} else {
					editor.chain().focus().toggleMark(command).run();
				}
			}}
			className={`p-2 rounded-md transition-colors ${
				isActive(isBlock ? { [command]: true } : command)
					? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
					: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
			}`}
			title={label}
		>
			<Icon size={16} />
		</button>
	);

	return (
		<div className="sticky top-14 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
			<div className="max-w-7xl mx-auto flex items-center h-11 px-2">
				{/* Text styles */}
				<ButtonGroup>
					<ToolButton
						icon={Bold}
						label="Bold (Cmd+B)"
						command="bold"
					/>
					<ToolButton
						icon={Italic}
						label="Italic (Cmd+I)"
						command="italic"
					/>
					<ToolButton
						icon={Underline}
						label="Underline (Cmd+U)"
						command="underline"
					/>
				</ButtonGroup>

				<div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

				{/* Headings */}
				<ButtonGroup>
					<ToolButton
						icon={Heading1}
						label="Heading 1"
						command="toggleHeading"
						isBlock
					/>
					<ToolButton
						icon={Heading2}
						label="Heading 2"
						command="toggleHeading"
						isBlock
					/>
					<ToolButton
						icon={Heading3}
						label="Heading 3"
						command="toggleHeading"
						isBlock
					/>
				</ButtonGroup>

				<div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

				{/* Lists and blocks */}
				<ButtonGroup>
					<ToolButton
						icon={List}
						label="Bullet List"
						command="toggleBulletList"
						isBlock
					/>
					<ToolButton
						icon={ListOrdered}
						label="Ordered List"
						command="toggleOrderedList"
						isBlock
					/>
					<ToolButton
						icon={Quote}
						label="Blockquote"
						command="toggleBlockquote"
						isBlock
					/>
				</ButtonGroup>

				<div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

				{/* Undo/Redo */}
				<ButtonGroup>
					<button
						onClick={() => editor.chain().focus().undo().run()}
						className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
						title="Undo (Cmd+Z)"
						disabled={!editor.can().undo()}
					>
						<Undo2 size={16} />
					</button>
					<button
						onClick={() => editor.chain().focus().redo().run()}
						className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
						title="Redo (Cmd+Y)"
						disabled={!editor.can().redo()}
					>
						<Redo2 size={16} />
					</button>
				</ButtonGroup>

				<div className="flex-1" />
			</div>
		</div>
	);
}

export default Toolbar;
