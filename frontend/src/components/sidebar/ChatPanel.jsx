import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

/**
 * Live room chat panel.
 * @param {{
 * messages: Array<{ id: string, userId: number|string, username: string, color: string, message: string, timestamp: string }>,
 * currentUserId: number|string,
 * onSend: (message: string) => void,
 * collapsed: boolean,
 * onToggle: () => void
 * }} props
 * @returns {JSX.Element}
 */
export default function ChatPanel({ messages, currentUserId, onSend, collapsed, onToggle }) {
	const [input, setInput] = useState("");
	const [unread, setUnread] = useState(0);
	const listRef = useRef(null);

	useEffect(() => {
		if (!collapsed) {
			setUnread(0);
		}
	}, [collapsed]);

	useEffect(() => {
		if (collapsed && messages.length > 0) {
			setUnread((prev) => prev + 1);
		}
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	}, [collapsed, messages]);

	const counter = useMemo(() => Math.max(0, input.length), [input.length]);

	const send = () => {
		const text = input.trim();
		if (!text) {
			return;
		}
		onSend(text);
		setInput("");
	};

	return (
		<section className="chat-panel side-card">
			<button type="button" className="accordion-header" onClick={onToggle}>
				<span><MessageCircle size={16} /> Chat</span>
				<span>{unread > 0 ? <b className="unread-dot">{unread}</b> : null} {collapsed ? "▾" : "▴"}</span>
			</button>
			{collapsed ? null : (
				<>
					<div className="chat-list" ref={listRef}>
						{messages.map((msg) => {
							const isSelf = String(msg.userId) === String(currentUserId);
							return (
								<div key={msg.id} className={isSelf ? "chat-msg self" : "chat-msg"}>
									<div className="chat-meta">
										<strong style={{ color: msg.color }}>{msg.username}</strong>
										<small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
									</div>
									<p>{msg.message}</p>
								</div>
							);
						})}
					</div>
					<div className="chat-input-row">
						<textarea
							value={input}
							onChange={(event) => setInput(event.target.value.slice(0, 500))}
							onKeyDown={(event) => {
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault();
									send();
								}
							}}
							placeholder="Message..."
						/>
						<button type="button" onClick={send}><Send size={14} /></button>
					</div>
					{counter > 400 ? <small className="chat-counter">{counter}/500</small> : null}
				</>
			)}
		</section>
	);
}
