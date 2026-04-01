import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { toast } from "../../lib/toast.js";

/**
 * Wraps main application content with branded layout.
 * @param {{ children: import("react").ReactNode, documentId: string }} props - Layout props.
 * @returns {JSX.Element}
 */
export default function AppLayout({ children, documentId }) {
	const [copied, setCopied] = useState(false);
	const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

	useEffect(() => {
		document.documentElement.classList.toggle("dark", darkMode);
	}, [darkMode]);

	const handleShare = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success("Room link copied!");
		} catch {
			setCopied(false);
			toast.error("Could not copy room link");
		}
	};

	const toggleTheme = () => {
		const next = !darkMode;
		setDarkMode(next);
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("theme", next ? "dark" : "light");
	};

	return (
		<div className="app-shell bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
			<header className="app-header">
				<div className="title-wrap">
					<p className="app-kicker text-xs font-bold tracking-widest bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HACKATHON BUILD</p>
					<h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-1">Live Collaborative Editor</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Fast shared writing with conflict-free edits and live presence.</p>
				</div>
				<div className="header-actions">
					<div className="px-3 py-1.5 bg-blue-600 text-white text-sm font-mono rounded-full shadow-sm">Room:{documentId}</div>
					<button type="button" className="toolbar-btn" onClick={toggleTheme} aria-label="Toggle theme">
						{darkMode ? <Sun size={16} /> : <Moon size={16} />}
					</button>
					<button type="button" className="toolbar-btn" onClick={handleShare}>
						{copied ? "Copied!" : "Share"}
					</button>
				</div>
			</header>
			<main className="app-main">{children}</main>
		</div>
	);
}
