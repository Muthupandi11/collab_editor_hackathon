import { useEffect, useRef, useState } from "react";
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
	Type,
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
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => onSelect(color)}
						style={{ backgroundColor: color === "transparent" ? "#fff" : color }}
						className={color === "transparent" ? "transparent" : ""}
						aria-label={`Select ${color}`}
					/>
				))}
			</div>
			<div className="toolbar-color-custom">
				<input type="color" onMouseDown={(event) => event.preventDefault()} onChange={(event) => onSelect(event.target.value)} />
				<button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClear}>Clear</button>
			</div>
		</div>
	);
}

function ToolButton({ title, icon: Icon, active = false, disabled = false, onMouseDown, onClick }) {
	return (
		<button
			type="button"
			className={active ? "toolbar-tool-btn active" : "toolbar-tool-btn"}
			title={title}
			disabled={disabled}
			onMouseDown={onMouseDown}
			onClick={onClick}
		>
			<Icon size={14} />
			<span>{title}</span>
		</button>
	);
}

/**
 * Renders compact editor formatting controls in a Word-like row layout.
 * @param {{ editor: import("@tiptap/react").Editor | null, ready: boolean }} props - Toolbar props.
 * @returns {JSX.Element}
 */
export default function Toolbar({ editor, ready }) {
	const disabled = !editor || !ready;
	const [showTextColor, setShowTextColor] = useState(false);
	const [showHighlightColor, setShowHighlightColor] = useState(false);
	const toolbarRef = useRef(null);

	const currentFontSize = editor?.getAttributes("textStyle")?.fontSize || "16px";
	const currentFontFamily = editor?.getAttributes("textStyle")?.fontFamily || "Inter, sans-serif";

	const keepSelection = (event) => {
		event.preventDefault();
	};

	const runWithSelection = (configureChain) => {
		if (!editor) {
			return;
		}

		const selection = editor.state.selection;
		const chain = editor.chain().focus().setTextSelection({ from: selection.from, to: selection.to });
		configureChain(chain);
		chain.run();
	};

	useEffect(() => {
		const handlePointerDown = (event) => {
			if (!toolbarRef.current?.contains(event.target)) {
				setShowTextColor(false);
				setShowHighlightColor(false);
			}
		};

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				setShowTextColor(false);
				setShowHighlightColor(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	return (
		<div className="toolbar" ref={toolbarRef}>
			<div className="toolbar-row">
				<div className="toolbar-group toolbar-group-text">
					<div className="toolbar-inline-label"><Type size={13} /><span>Text</span></div>
					<select
						id="font-family-select"
						className="toolbar-select"
						disabled={disabled}
						value={currentFontFamily}
						onChange={(event) => runWithSelection((chain) => chain.setMark("textStyle", { fontFamily: event.target.value }))}
					>
						{FONT_FAMILIES.map((family) => (
							<option key={family.value} value={family.value} style={{ fontFamily: family.value }}>{family.label}</option>
						))}
					</select>
					<select
						id="font-size-select"
						className="toolbar-select small"
						disabled={disabled}
						value={currentFontSize}
						onChange={(event) => runWithSelection((chain) => chain.setMark("textStyle", { fontSize: event.target.value }))}
					>
						{FONT_SIZES.map((size) => (
							<option key={size} value={size}>{size.replace("px", "")}</option>
						))}
					</select>
				</div>

				<div className="toolbar-group">
					<ToolButton title="Bold" icon={Bold} active={editor?.isActive("bold")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleBold())} disabled={disabled} />
					<ToolButton title="Italic" icon={Italic} active={editor?.isActive("italic")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleItalic())} disabled={disabled} />
					<ToolButton title="Underline" icon={Underline} active={editor?.isActive("underline")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleUnderline())} disabled={disabled} />
					<ToolButton title="Strike" icon={Strikethrough} active={editor?.isActive("strike")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleStrike())} disabled={disabled} />
				</div>

				<div className="toolbar-group">
					<ToolButton title="H1" icon={Heading1} active={editor?.isActive("heading", { level: 1 })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleHeading({ level: 1 }))} disabled={disabled} />
					<ToolButton title="H2" icon={Heading2} active={editor?.isActive("heading", { level: 2 })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleHeading({ level: 2 }))} disabled={disabled} />
					<ToolButton title="H3" icon={Heading3} active={editor?.isActive("heading", { level: 3 })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleHeading({ level: 3 }))} disabled={disabled} />
				</div>

				<div className="toolbar-group">
					<ToolButton title="Left" icon={AlignLeft} active={editor?.isActive({ textAlign: "left" })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.setTextAlign("left"))} disabled={disabled} />
					<ToolButton title="Center" icon={AlignCenter} active={editor?.isActive({ textAlign: "center" })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.setTextAlign("center"))} disabled={disabled} />
					<ToolButton title="Right" icon={AlignRight} active={editor?.isActive({ textAlign: "right" })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.setTextAlign("right"))} disabled={disabled} />
					<ToolButton title="Justify" icon={AlignJustify} active={editor?.isActive({ textAlign: "justify" })} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.setTextAlign("justify"))} disabled={disabled} />
				</div>

				<div className="toolbar-group">
					<ToolButton title="Bullets" icon={List} active={editor?.isActive("bulletList")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleBulletList())} disabled={disabled} />
					<ToolButton title="Numbered" icon={ListOrdered} active={editor?.isActive("orderedList")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleOrderedList())} disabled={disabled} />
					<ToolButton title="Quote" icon={Quote} active={editor?.isActive("blockquote")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleBlockquote())} disabled={disabled} />
					<ToolButton title="Code" icon={Code2} active={editor?.isActive("codeBlock")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleCodeBlock())} disabled={disabled} />
				</div>

				<div className="toolbar-group">
					<ToolButton title="Sub" icon={Subscript} active={editor?.isActive("subscript")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleSubscript())} disabled={disabled} />
					<ToolButton title="Super" icon={Superscript} active={editor?.isActive("superscript")} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.toggleSuperscript())} disabled={disabled} />
					<ToolButton title="Rule" icon={Minus} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.setHorizontalRule())} disabled={disabled} />
				</div>

				<div className="toolbar-group">
					<div className="toolbar-popover-anchor">
						<ToolButton title="Text Color" icon={Palette} onMouseDown={keepSelection} onClick={() => { setShowTextColor((prev) => !prev); setShowHighlightColor(false); }} disabled={disabled} />
						{showTextColor ? (
							<ToolbarColorPopover
								title="Text color"
								colors={TEXT_COLORS}
								onSelect={(color) => runWithSelection((chain) => chain.setColor(color))}
								onClear={() => runWithSelection((chain) => chain.unsetColor())}
							/>
						) : null}
					</div>
					<div className="toolbar-popover-anchor">
						<ToolButton title="Highlight" icon={Highlighter} onMouseDown={keepSelection} onClick={() => { setShowHighlightColor((prev) => !prev); setShowTextColor(false); }} disabled={disabled} />
						{showHighlightColor ? (
							<ToolbarColorPopover
								title="Highlight"
								colors={HIGHLIGHT_COLORS}
								onSelect={(color) => {
									if (color === "transparent") {
										runWithSelection((chain) => chain.unsetHighlight());
										return;
									}
									runWithSelection((chain) => chain.toggleHighlight({ color }));
								}}
								onClear={() => runWithSelection((chain) => chain.unsetHighlight())}
							/>
						) : null}
					</div>
				</div>

				<div className="toolbar-group">
					<ToolButton title="Undo" icon={Undo2} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.undo())} disabled={disabled || !editor?.can().undo()} />
					<ToolButton title="Redo" icon={Redo2} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.redo())} disabled={disabled || !editor?.can().redo()} />
					<ToolButton title="Clear" icon={Eraser} onMouseDown={keepSelection} onClick={() => runWithSelection((chain) => chain.clearNodes().unsetAllMarks())} disabled={disabled} />
				</div>
			</div>
		</div>
	);
}
