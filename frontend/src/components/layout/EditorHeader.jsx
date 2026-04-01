import { Download, Moon, Pencil, Share2, Sun } from "lucide-react";

/**
 * Top fixed editor header with title input and actions.
 * @param {{
 * title: string,
 * onTitleChange: (value: string) => void,
 * users: Array<{ id: number, name: string, color: string }>,
 * roomId: string,
 * darkMode: boolean,
 * onToggleTheme: () => void,
 * onShare: () => void,
 * onExport: () => void,
 * connectionBadge: import("react").ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export default function EditorHeader({
	title,
	onTitleChange,
	users,
	roomId,
	darkMode,
	onToggleTheme,
	onShare,
	onExport,
	connectionBadge
}) {
	const visibleUsers = users.slice(0, 4);
	const overflow = Math.max(0, users.length - 4);

	return (
		<header className="editor-header">
			<div className="header-left">
				<div className="brand-icon"><Pencil size={16} /></div>
				<div className="brand-title">CollabEditor</div>
				<div className="brand-divider" />
				<input
					type="text"
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
					onKeyDown={(event) => event.stopPropagation()}
					className="header-title-input"
					placeholder="Untitled Document"
				/>
			</div>
			<div className="header-right">
				<div className="avatar-stack">
					{visibleUsers.map((user, index) => (
						<div
							key={user.id}
							className="avatar-pill"
							style={{ backgroundColor: user.color, marginLeft: index === 0 ? 0 : -8 }}
							title={`${user.name} · Active now`}
						>
							{user.name.slice(0, 1).toUpperCase()}
						</div>
					))}
					{overflow > 0 ? <div className="avatar-overflow">+{overflow}</div> : null}
				</div>
				<div className="brand-divider" />
				<div className="room-chip">Room: {roomId}</div>
				<button type="button" className="header-btn" onClick={onShare}><Share2 size={15} /> Share</button>
				<button type="button" className="header-btn" onClick={onExport}><Download size={15} /> Export</button>
				<button type="button" className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
					{darkMode ? <Sun size={16} /> : <Moon size={16} />}
				</button>
				{connectionBadge}
			</div>
		</header>
	);
}
