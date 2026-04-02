import { Check, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";

const COLORS = ["#2563EB", "#16A34A", "#DC2626", "#9333EA", "#EA580C", "#DB2777"];

function isValidName(name) {
	return /^[A-Za-z][A-Za-z ]{1,29}$/.test(name.trim());
}

/**
 * Onboarding modal to collect real user identity before entering the editor.
 * @param {{
 * initialName?: string,
 * initialRoom?: string,
 * initialColor?: string,
 * onSubmit: (payload: { username: string, room: string, color: string }) => void
 * }} props
 * @returns {JSX.Element}
 */
export default function JoinModal({ initialName = "", initialRoom = "", initialColor, onSubmit }) {
	const [username, setUsername] = useState(initialName);
	const [room, setRoom] = useState(initialRoom);
	const [color, setColor] = useState(initialColor || COLORS[Math.floor(Math.random() * COLORS.length)]);

	const validName = useMemo(() => isValidName(username), [username]);

	return (
		<div className="join-modal-overlay" role="dialog" aria-modal="true" aria-label="Join CollabEditor">
			<div className="join-modal-card">
				<div className="join-modal-icon">
					<PencilLine size={22} />
				</div>
				<h1>Welcome to CollabEditor</h1>
				<p>Enter your name so others know who you are</p>

				<label htmlFor="join-name">Your name</label>
				<input
					id="join-name"
					type="text"
					value={username}
					maxLength={30}
					autoFocus
					placeholder="Your name (e.g. Alex)"
					onKeyDown={(event) => event.stopPropagation()}
					onChange={(event) => setUsername(event.target.value)}
				/>
				{username.trim().length > 0 && !validName ? (
					<small className="join-modal-error">Use 2-30 letters and spaces only.</small>
				) : null}

				<label htmlFor="join-room">Room ID (optional)</label>
				<input
					id="join-room"
					type="text"
					value={room}
					placeholder="Leave blank to create new room"
					onKeyDown={(event) => event.stopPropagation()}
					onChange={(event) => setRoom(event.target.value)}
				/>
				<small className="join-modal-helper">Share this ID with others to collaborate.</small>

				<div className="join-modal-colors">
					<span>Pick your cursor color</span>
					<div>
						{COLORS.map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => setColor(item)}
								className={item === color ? "selected" : ""}
								style={{ backgroundColor: item }}
								aria-label={`Select color ${item}`}
							>
								{item === color ? <Check size={14} /> : null}
							</button>
						))}
					</div>
				</div>

				<button
					type="button"
					disabled={!validName}
					className="join-modal-submit"
					onClick={() => {
						if (!validName) {
							return;
						}
						onSubmit({
							username: username.trim(),
							room: room.trim(),
							color
						});
					}}
				>
					Join Room {">"}
				</button>
				<small className="join-modal-footer">Your name is only visible in this session.</small>
			</div>
		</div>
	);
}
