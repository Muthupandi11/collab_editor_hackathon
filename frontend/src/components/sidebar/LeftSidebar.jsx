/**
 * Left sidebar with stats, shortcuts and quick actions.
 * @param {{
 * stats: { revisions: number, users: number, updatedText: string },
 * onNewRoom: () => void,
 * onCopyLink: () => void,
 * onClear: () => void
 * }} props
 * @returns {JSX.Element}
 */
export default function LeftSidebar({ stats, onNewRoom, onCopyLink, onClear }) {
	return (
		<aside className="left-sidebar">
			<section className="side-card">
				<h3>Document Stats</h3>
				<p>Last modified: {stats.updatedText}</p>
				<p>Total revisions: {stats.revisions}</p>
				<p>Active sessions: {stats.users}</p>
			</section>
			<section className="side-card">
				<h3>Keyboard Shortcuts</h3>
				<ul>
					<li>Ctrl/Cmd+B: Bold</li>
					<li>Ctrl/Cmd+I: Italic</li>
					<li>Ctrl/Cmd+U: Underline</li>
					<li>Ctrl/Cmd+S: Force save</li>
					<li>Ctrl/Cmd+Shift+C: Copy room link</li>
				</ul>
			</section>
			<section className="side-card">
				<h3>Quick Actions</h3>
				<div className="side-actions">
					<button type="button" onClick={onNewRoom}>New Room</button>
					<button type="button" onClick={onCopyLink}>Copy Room Link</button>
					<button type="button" onClick={onClear}>Clear Document</button>
				</div>
			</section>
		</aside>
	);
}
