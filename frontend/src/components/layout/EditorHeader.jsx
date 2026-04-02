import { Bell, BellOff, Download, Moon, Pencil, Share2, Sun, Upload } from "lucide-react";
import { useState } from "react";

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
	onImport,
	onExport,
	connectionBadge,
	currentUser,
	onRequestIdentityEdit,
	soundEnabled,
	onToggleSound,
	activeEditors = []
}) {
	const [showProfileMenu, setShowProfileMenu] = useState(false);
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
				<div className="profile-anchor">
					<button
						type="button"
						className="profile-pill"
						onClick={() => setShowProfileMenu((prev) => !prev)}
					>
						<span className="profile-avatar" style={{ backgroundColor: currentUser?.color || "#2563EB" }}>
							{(currentUser?.name || "U").slice(0, 1).toUpperCase()}
						</span>
						<span>{currentUser?.name || "User"}</span>
					</button>
					{showProfileMenu ? (
						<div className="profile-popover">
							<button
								type="button"
								onClick={() => {
									setShowProfileMenu(false);
									onRequestIdentityEdit?.();
								}}
							>
								Change name
							</button>
						</div>
					) : null}
				</div>
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
				{activeEditors.length > 0 ? (
					<div className="header-editing-indicator" title="Currently editing">
						<span>Editing:</span>
						{activeEditors.slice(0, 2).map((name) => (
							<span key={name} className="header-editing-chip">{name}</span>
						))}
						{activeEditors.length > 2 ? <span className="header-editing-chip">+{activeEditors.length - 2}</span> : null}
					</div>
				) : null}
				<div className="brand-divider" />
				<div className="room-chip">Room: {roomId}</div>
				<button type="button" className="header-btn" onClick={onShare}><Share2 size={15} /> Share</button>
				<button type="button" className="header-btn" onClick={onImport}><Upload size={15} /> Import</button>
				<button type="button" className="header-btn" onClick={onExport}><Download size={15} /> Export</button>
				<button type="button" className="icon-btn" onClick={onToggleSound} aria-label="Toggle sound">
					{soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
				</button>
				<button type="button" className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
					{darkMode ? <Sun size={16} /> : <Moon size={16} />}
				</button>
				{connectionBadge}
			</div>
		</header>
	);
}
