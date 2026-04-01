import React, { useEffect, useState } from "react";

/**
 * Online users list component for right sidebar
 * @param {{ users: Array<{ id: number, name: string, color: string, isSelf: boolean }> }} props
 */
export function OnlineUsers({ users = [] }) {
	const [displayUsers, setDisplayUsers] = useState([]);

	useEffect(() => {
		setDisplayUsers(users);
	}, [users]);

	if (!displayUsers.length) {
		return (
			<div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
				No other users online
			</div>
		);
	}

	return (
		<div className="p-4 space-y-3">
			{displayUsers.map((user) => (
				<div
					key={user.id}
					className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors animate-slide-in"
				>
					<div
						className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
						style={{ backgroundColor: user.color }}
					>
						{user.name
							.split(" ")
							.map((n) => n[0])
							.join("")
							.toUpperCase()
							.slice(0, 2)}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
							{user.name}
						</p>
					</div>
					{user.isSelf && (
						<span className="text-xs font-semibold px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
							YOU
						</span>
					)}
					<div
						className="w-2 h-2 rounded-full flex-shrink-0"
						style={{ backgroundColor: user.color }}
					/>
				</div>
			))}
		</div>
	);
}

export default OnlineUsers;
