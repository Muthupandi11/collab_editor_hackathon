import { useMemo, useState } from "react";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	Code2,
	Eraser,
	Heading1,
	Heading2,
	Heading3,
	Highlighter,
	Italic,
	List,
	ListOrdered,
	Minus,
	Palette,
	Quote,
	Redo2,
	Strikethrough,
	Subscript,
	Superscript,
	Underline,
	Undo2
} from "lucide-react";

const FONT_FAMILIES = [
	{ label: "Default (Inter)", value: "Inter, sans-serif" },
	{ label: "Serif (Georgia)", value: "Georgia, serif" },
	{ label: "Mono (Courier)", value: '"Courier New", monospace' },
	{ label: "Sans (Arial)", value: "Arial, sans-serif" },
	{ label: "Cursive (Brush Script)", value: '"Brush Script MT", cursive' }
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px", "64px"];
const TEXT_COLORS = ["#000000", "#FFFFFF", "#DC2626", "#EA580C", "#EAB308", "#16A34A", "#2563EB", "#7C3AED", "#DB2777", "#92400E", "#6B7280", "#D1D5DB"];
const HIGHLIGHT_COLORS = ["#FEF08A", "#86EFAC", "#93C5FD", "#F9A8D4", "#FDBA74", "#C4B5FD", "#D1D5DB", "transparent"];

function ToolbarColorPopover({ title, colors, onSelect, onClear }) {
	return (
		<div className="toolbar-popover">
			<p>{title}</p>
			<div className="toolbar-color-grid">
				{colors.map((color) => (
					<button
						key={color}
						type="button"
						onClick={() => onSelect(color)}
						style={{ backgroundColor: color === "transparent" ? "#fff" : color }}
						className={color === "transparent" ? "transparent" : ""}
						aria-label={`Select ${color}`}
					/>
				))}
			</div>
			<div className="toolbar-color-custom">
				<input type="color" onChange={(event) => onSelect(event.target.value)} />
				<button type="button" onClick={onClear}>Clear</button>
			</div>
		</div>
	);
}

/**
 * Renders editor formatting controls.
 * @param {{ editor: import("@tiptap/react").Editor | null, ready: boolean }} props - Toolbar props.
 * @returns {JSX.Element}
 */
export default function Toolbar({ editor, ready }) {
	const disabled = !editor || !ready;
	const [showTextColor, setShowTextColor] = useState(false);
	const [showHighlightColor, setShowHighlightColor] = useState(false);

	const currentFontSize = useMemo(() => editor?.getAttributes("textStyle")?.fontSize || "16px", [editor]);
	const currentFontFamily = useMemo(() => editor?.getAttributes("textStyle")?.fontFamily || "Inter, sans-serif", [editor]);

	const actionClass = (active) =>
		active ? "toolbar-icon-btn active dark:text-blue-300" : "toolbar-icon-btn dark:text-gray-300 dark:hover:bg-gray-700";

	return (
		<div className="toolbar overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
			<div className="toolbar-group" role="group" aria-label="Basic formatting">
				<button type="button" className={actionClass(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} disabled={disabled}><Bold size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={disabled}><Italic size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("underline"))} onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={disabled}><Underline size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("strike"))} onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={disabled}><Strikethrough size={16} /></button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="Headings">
				<button type="button" className={actionClass(editor?.isActive("heading", { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={disabled}><Heading1 size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={disabled}><Heading2 size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} disabled={disabled}><Heading3 size={16} /></button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="Font controls">
				<select
					className="toolbar-select"
					disabled={disabled}
					value={currentFontFamily}
					onChange={(event) => editor?.chain().focus().setMark("textStyle", { fontFamily: event.target.value }).run()}
				>
					{FONT_FAMILIES.map((family) => (
						<option key={family.value} value={family.value} style={{ fontFamily: family.value }}>{family.label}</option>
					))}
				</select>
				<select
					className="toolbar-select small"
					disabled={disabled}
					value={currentFontSize}
					onChange={(event) => editor?.chain().focus().setMark("textStyle", { fontSize: event.target.value }).run()}
				>
					{FONT_SIZES.map((size) => (
						<option key={size} value={size}>{size.replace("px", "")}</option>
					))}
				</select>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group toolbar-popover-anchor" role="group" aria-label="Color controls">
				<button type="button" className={actionClass(false)} onClick={() => { setShowTextColor((prev) => !prev); setShowHighlightColor(false); }} disabled={disabled}><Palette size={16} /></button>
				<button type="button" className={actionClass(false)} onClick={() => { setShowHighlightColor((prev) => !prev); setShowTextColor(false); }} disabled={disabled}><Highlighter size={16} /></button>
				{showTextColor ? (
					<ToolbarColorPopover
						title="Text color"
						colors={TEXT_COLORS}
						onSelect={(color) => editor?.chain().focus().setColor(color).run()}
						onClear={() => editor?.chain().focus().unsetColor().run()}
					/>
				) : null}
				{showHighlightColor ? (
					<ToolbarColorPopover
						title="Highlight"
						colors={HIGHLIGHT_COLORS}
						onSelect={(color) => {
							if (color === "transparent") {
								editor?.chain().focus().unsetHighlight().run();
								return;
							}
							editor?.chain().focus().toggleHighlight({ color }).run();
						}}
						onClear={() => editor?.chain().focus().unsetHighlight().run()}
					/>
				) : null}
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="Alignment">
				<button type="button" className={actionClass(editor?.isActive({ textAlign: "left" }))} onClick={() => editor?.chain().focus().setTextAlign("left").run()} disabled={disabled}><AlignLeft size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive({ textAlign: "center" }))} onClick={() => editor?.chain().focus().setTextAlign("center").run()} disabled={disabled}><AlignCenter size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive({ textAlign: "right" }))} onClick={() => editor?.chain().focus().setTextAlign("right").run()} disabled={disabled}><AlignRight size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive({ textAlign: "justify" }))} onClick={() => editor?.chain().focus().setTextAlign("justify").run()} disabled={disabled}><AlignJustify size={16} /></button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="Lists and blocks">
				<button type="button" className={actionClass(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={disabled}><List size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={disabled}><ListOrdered size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={disabled}><Quote size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("codeBlock"))} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} disabled={disabled}><Code2 size={16} /></button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="Extra formatting">
				<button type="button" className={actionClass(editor?.isActive("subscript"))} onClick={() => editor?.chain().focus().toggleSubscript().run()} disabled={disabled}><Subscript size={16} /></button>
				<button type="button" className={actionClass(editor?.isActive("superscript"))} onClick={() => editor?.chain().focus().toggleSuperscript().run()} disabled={disabled}><Superscript size={16} /></button>
				<button type="button" className={actionClass(false)} onClick={() => editor?.chain().focus().setHorizontalRule().run()} disabled={disabled}><Minus size={16} /></button>
			</div>
			<div className="toolbar-divider" />
			<div className="toolbar-group" role="group" aria-label="History and cleanup">
				<button type="button" className="toolbar-icon-btn" onClick={() => editor?.chain().focus().undo().run()} disabled={disabled || !editor?.can().undo()}><Undo2 size={16} /></button>
				<button type="button" className="toolbar-icon-btn" onClick={() => editor?.chain().focus().redo().run()} disabled={disabled || !editor?.can().redo()}><Redo2 size={16} /></button>
				<button type="button" className="toolbar-icon-btn" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} disabled={disabled}><Eraser size={16} /></button>
			</div>
		</div>
	);
}
