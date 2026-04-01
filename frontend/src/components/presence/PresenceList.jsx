/**
 * Creates initials from a user display name.
 * @param {string} name - User display name.
 * @returns {string}
 */
function getInitials(name) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((token) => token[0]?.toUpperCase() || "")
		.join("");
}

/**
 * Displays active collaborators in the current room.
 * @param {{ users: Array<{ id: number, name: string, color: string, isSelf?: boolean }> }} props - Presence list props.
 * @returns {JSX.Element}
 */
export default function PresenceList({ users }) {
	return (
		<aside className="presence-panel">
			<div className="panel-title-row">
				<h2>Online Users</h2>
				<span className="panel-count">{users.length}</span>
			</div>
			<ul>
				{users.length === 0 ? <li className="presence-empty">No collaborators yet.</li> : null}
				{users.map((user) => (
					<li key={user.id} className="presence-item">
						<span className="presence-avatar" style={{ backgroundColor: user.color }}>
							{getInitials(user.name)}
						</span>
						<div className="presence-meta">
							<span className="presence-name">{user.name}</span>
							{user.isSelf ? <span className="presence-you">You</span> : null}
						</div>
					</li>
				))}
			</ul>
		</aside>
	);
}
