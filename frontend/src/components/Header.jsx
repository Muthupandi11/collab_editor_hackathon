import React, { useState, useEffect, useRef } from "react";
import { Share2, Moon, Sun, X } from "lucide-react";
import { toast } from "./Toast.jsx";

/**
 * Header component with editable title, share button, dark mode toggle, online users avatars
 * @param {{ documentId: string, title: string, onTitleChange: (title: string) => void, onlineUsers: Array, connectionStatus: 'connected' | 'connecting' | 'disconnected' }} props
 */
export function Header({
	documentId,
	title = "Untitled Document",
	onTitleChange,
	onlineUsers = [],
	connectionStatus = "connecting"
}) {
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editValue, setEditValue] = useState(title);
	const [isDarkMode, setIsDarkMode] = useState(false);
	const titleInputRef = useRef(null);

	// Load dark mode preference from localStorage
	useEffect(() => {
		const savedDarkMode = localStorage.getItem("collab-theme") === "dark";
		setIsDarkMode(savedDarkMode);
		applyDarkMode(savedDarkMode);
	}, []);

	useEffect(() => {
		// Update title editValue when prop changes
		setEditValue(title);
	}, [title]);

	useEffect(() => {
		// Focus input when editing starts
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
			titleInputRef.current.select();
		}
	}, [isEditingTitle]);

	const applyDarkMode = (isDark) => {
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	};

	const handleTitleSave = () => {
		const trimmed = editValue.trim() || title;
		setEditValue(trimmed);
		onTitleChange?.(trimmed);
		setIsEditingTitle(false);
		document.title = `${trimmed} — CollabEditor`;
	};

	const handleTitleKeyDown = (e) => {
		if (e.key === "Enter") {
			handleTitleSave();
		} else if (e.key === "Escape") {
			setEditValue(title);
			setIsEditingTitle(false);
		}
	};

	const handleShare = async () => {
		try {
			const url = window.location.href;
			await navigator.clipboard.writeText(url);
			toast.success("Room link copied to clipboard!");
		} catch (error) {
			toast.error("Failed to copy link");
		}
	};

	const handleDarkModeToggle = () => {
		const newDarkMode = !isDarkMode;
		setIsDarkMode(newDarkMode);
		applyDarkMode(newDarkMode);
		localStorage.setItem("collab-theme", newDarkMode ? "dark" : "light");
	};

	const getConnectionBadgeStyles = () => {
		if (connectionStatus === "connected") {
			return {
				bgColor: "bg-green-100 dark:bg-green-900/30",
				textColor: "text-green-700 dark:text-green-300",
				dotColor: "bg-green-500",
				icon: "Live"
			};
		} else if (connectionStatus === "connecting") {
			return {
				bgColor: "bg-amber-100 dark:bg-amber-900/30",
				textColor: "text-amber-700 dark:text-amber-300",
				dotColor: "bg-amber-500 animate-pulse",
				icon: "Connecting"
			};
		} else {
			return {
				bgColor: "bg-red-100 dark:bg-red-900/30",
				textColor: "text-red-700 dark:text-red-300",
				dotColor: "bg-red-500",
				icon: "Offline"
			};
		}
	};

	const badgeStyles = getConnectionBadgeStyles();

	// Get unique avatars (up to 4)
	const displayUsers = onlineUsers.slice(0, 4);
	const overflowCount = Math.max(0, onlineUsers.length - 4);

	return (
		<header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
			<div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between h-14">
				{/* Left: Logo + Title */}
				<div className="flex items-center gap-4 flex-1 min-w-0">
					<div className="flex-shrink-0">
						<div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
							<span className="text-white font-bold text-sm">C</span>
						</div>
					</div>

					<div className="flex items-center gap-2 min-w-0">
						<span className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:inline">
							CollabEditor
						</span>

						{isEditingTitle ? (
							<input
								ref={titleInputRef}
								type="text"
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								onBlur={handleTitleSave}
								onKeyDown={handleTitleKeyDown}
								className="px-2 py-1 border border-blue-500 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
								placeholder="Document title..."
							/>
						) : (
							<button
								onClick={() => setIsEditingTitle(true)}
								className="px-2 py-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
								title="Click to edit title"
							>
								{title || "Untitled"}
							</button>
						)}
					</div>
				</div>

				{/* Right: Room badge, Share, Dark mode, Users, Status */}
				<div className="flex items-center gap-3 flex-shrink-0">
					{/* Room badge */}
					<div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block">
						doc/{documentId}
					</div>

					{/* Share button */}
					<button
						onClick={handleShare}
						className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors"
						title="Copy share link"
					>
						<Share2 size={16} />
						<span className="hidden sm:inline">Share</span>
					</button>

					{/* Dark mode toggle */}
					<button
						onClick={handleDarkModeToggle}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
						title="Toggle dark mode"
					>
						{isDarkMode ? (
							<Sun size={18} className="text-gray-900 dark:text-gray-100" />
						) : (
							<Moon size={18} className="text-gray-900 dark:text-gray-100" />
						)}
					</button>

					{/* Avatar stack */}
					<div className="flex -space-x-2 ml-2">
						{displayUsers.map((user) => (
							<div
								key={user.id}
								className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-gray-900 transition-colors"
								style={{ backgroundColor: user.color }}
								title={user.name + (user.isSelf ? " (You)" : "")}
							>
								{user.name
									.split(" ")
									.map((n) => n[0])
									.join("")
									.toUpperCase()
									.slice(0, 2)}
							</div>
						))}
						{overflowCount > 0 && (
							<div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gray-400 border-2 border-white dark:border-gray-900">
								+{overflowCount}
							</div>
						)}
					</div>

					{/* Connection status badge */}
					<div
						className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badgeStyles.bgColor} ${badgeStyles.textColor}`}
					>
						<div className={`w-2 h-2 rounded-full ${badgeStyles.dotColor}`} />
						<span className="hidden sm:inline">{badgeStyles.icon}</span>
					</div>
				</div>
			</div>
		</header>
	);
}

export default Header;
