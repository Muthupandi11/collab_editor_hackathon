import { useState } from "react";

/**
 * Wraps main application content with branded layout.
 * @param {{ children: import("react").ReactNode, documentId: string }} props - Layout props.
 * @returns {JSX.Element}
 */
export default function AppLayout({ children, documentId }) {
	const [copied, setCopied] = useState(false);

	const handleShare = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
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
					<button type="button" className="toolbar-btn" onClick={handleShare}>
						{copied ? "Copied!" : "Share"}
					</button>
				</div>
			</header>
			<main className="app-main">{children}</main>
		</div>
	);
}
