/**
 * Fixed bottom status bar.
 * @param {{ roomId: string, users: number, words: number, chars: number, saveLabel: string, latency: number | null }} props
 * @returns {JSX.Element}
 */
export default function StatusBar({ roomId, users, words, chars, saveLabel, latency }) {
	return (
		<footer className="status-bar">
			<span>Room: {roomId} | {users} users online</span>
			<span>{words} words · {chars} chars</span>
			<span>{saveLabel || "Idle"} {latency != null ? `| ${latency}ms` : ""}</span>
		</footer>
	);
}
