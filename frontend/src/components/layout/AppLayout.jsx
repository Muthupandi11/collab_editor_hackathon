/**
 * Wraps main application content with branded layout.
 * @param {{ children: import("react").ReactNode, documentId: string }} props - Layout props.
 * @returns {JSX.Element}
 */
export default function AppLayout({ children, documentId }) {
	return (
		<div className="app-shell">
			<header className="app-header">
				<div className="title-wrap">
					<p className="app-kicker">Hackathon Build</p>
					<h1>Live Collaborative Editor</h1>
					<p className="app-subtitle">Fast shared writing with conflict-free edits and live presence.</p>
				</div>
				<div className="room-chip">Room: {documentId}</div>
			</header>
			<main className="app-main">{children}</main>
		</div>
	);
}
