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
 * @param {{ users: Array<{ id: number, name: string, color: string, isSelf?: boolean }>, typingUsernames?: string[] }} props - Presence list props.
 * @returns {JSX.Element}
 */
export default function PresenceList({ users, typingUsernames = [] }) {
	const typingSet = new Set(typingUsernames.map((name) => name.toLowerCase()));

	return (
		<aside className="presence-panel bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
			<div className="panel-title-row border-l-4 border-blue-500 pl-3">
				<h2 className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Online Now</h2>
				<span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
				<span className="panel-count">{users.length}</span>
			</div>
			<ul>
				{users.length === 0 ? <li className="presence-empty">No other users online</li> : null}
				{users.map((user) => {
					const isEditing = typingSet.has((user.name || "").toLowerCase());

					return (
						<li key={user.id} className="presence-item bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg p-3 transition-all duration-200 translate-x-0" style={{ borderLeft: `4px solid ${user.color}` }}>
							<span className="presence-avatar" style={{ backgroundColor: user.color }}>
								{getInitials(user.name)}
							</span>
							<div className="presence-meta">
								<span className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.name}</span>
								<span className="block text-xs text-green-600 dark:text-green-400">{isEditing ? "● Editing now" : "● Active now"}</span>
								{user.isSelf ? <span className="presence-you">You</span> : null}
							</div>
						</li>
					);
				})}
			</ul>
		</aside>
	);
}
