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
	const [darkMode, setDarkMode] = useState(() => localStorage.getItem("collab-theme") === "dark");

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
		localStorage.setItem("collab-theme", next ? "dark" : "light");
	};

	return (
		<div className="app-shell">
			<header className="app-header">
				<div className="title-wrap">
					<p className="app-kicker">Hackathon Build</p>
					<h1>Live Collaborative Editor</h1>
					<p className="app-subtitle">Fast shared writing with conflict-free edits and live presence.</p>
				</div>
				<div className="header-actions">
					<div className="room-chip">Room: {documentId}</div>
					<button type="button" className="toolbar-btn" onClick={toggleTheme}>
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
