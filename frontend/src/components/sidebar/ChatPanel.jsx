import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, SendHorizontal } from "lucide-react";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥"];

function formatMessageTime(timestamp) {
	const date = new Date(timestamp);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minute = 60 * 1000;
	const hour = 60 * minute;

	if (diff < minute) {
		return "just now";
	}
	if (diff < hour) {
		return `${Math.floor(diff / minute)}m ago`;
	}

	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const startOfYesterday = startOfToday - 24 * hour;
	if (date.getTime() >= startOfToday) {
		return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	}
	if (date.getTime() >= startOfYesterday) {
		return `Yesterday ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
	}
	return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getInitials(name) {
	return String(name || "?")
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((token) => token[0].toUpperCase())
		.join("");
}

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
export default function ChatPanel({
	messages,
	currentUserId,
	onSend,
	onReact,
	collapsed,
	onToggle,
	isConnected,
	onReconnect,
	soundEnabled,
	onPlayNotification,
	onlineUsersCount
}) {
	const [input, setInput] = useState("");
	const [unread, setUnread] = useState(0);
	const [hoveredMessageId, setHoveredMessageId] = useState("");
	const [timeTick, setTimeTick] = useState(0);
	const [prevMessageCount, setPrevMessageCount] = useState(0);
	const messagesEndRef = useRef(null);
	const textareaRef = useRef(null);

	useEffect(() => {
		if (!collapsed) {
			setUnread(0);
		}
	}, [collapsed]);

	useEffect(() => {
		if (messages.length <= prevMessageCount) {
			return;
		}

		const latest = messages[messages.length - 1];
		const isMine = String(latest?.userId) === String(currentUserId);
		if (!isMine) {
			if (collapsed) {
				setUnread((prev) => prev + 1);
			}
			if (soundEnabled) {
				onPlayNotification?.();
			}
		}

		setPrevMessageCount(messages.length);
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 50);
	}, [collapsed, currentUserId, messages, onPlayNotification, prevMessageCount, soundEnabled]);

	useEffect(() => {
		const interval = setInterval(() => {
			setTimeTick((value) => value + 1);
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const counter = useMemo(() => Math.max(0, input.length), [input.length]);

	const send = () => {
		const text = input.trim();
		if (!text || !isConnected) {
			return;
		}
		onSend(text);
		setInput("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	};

	const resizeTextarea = (element) => {
		if (!element) {
			return;
		}
		element.style.height = "auto";
		element.style.height = `${Math.min(element.scrollHeight, 84)}px`;
	};

	return (
		<section className="chat-panel side-card">
			<button type="button" className="accordion-header" onClick={onToggle}>
				<span><MessageCircle size={16} /> Chat</span>
				<span>{collapsed && unread > 0 ? <b className="unread-dot">{unread}</b> : null} {collapsed ? "▾" : "▴"}</span>
			</button>
			{collapsed ? null : (
				<>
					<div className="chat-list" aria-live="polite">
						{messages.length === 0 ? (
							<div className="chat-empty-state">
								<MessageCircle size={32} />
								<p>No messages yet</p>
								<small>Be the first to say hello!</small>
							</div>
						) : null}
						{messages.map((msg) => {
							const isSelf = String(msg.userId) === String(currentUserId);
							const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];

							return (
								<div
									key={msg.id}
									className={isSelf ? "chat-msg self" : "chat-msg"}
									onMouseEnter={() => setHoveredMessageId(String(msg.id))}
									onMouseLeave={() => setHoveredMessageId("")}
								>
									{!isSelf ? (
										<div className="chat-avatar" style={{ backgroundColor: msg.color || "#2563EB" }}>
											{getInitials(msg.username)}
										</div>
									) : null}
									<div className="chat-body">
										{!isSelf ? <strong style={{ color: msg.color }}>{msg.username}</strong> : null}
										<p>{msg.message}</p>
										<small>
											{formatMessageTime(msg.timestamp)}
											{isSelf && onlineUsersCount > 1 ? "  ✓✓" : ""}
										</small>
										{hoveredMessageId === String(msg.id) ? (
											<div className="chat-reactions-picker">
												{QUICK_REACTIONS.map((emoji) => (
													<button key={emoji} type="button" onClick={() => onReact?.(msg.id, emoji)}>
														{emoji}
													</button>
												))}
											</div>
										) : null}
										{reactions.length > 0 ? (
											<div className="chat-reactions-row">
												{reactions.map((reaction) => (
													<span key={`${msg.id}-${reaction.emoji}`}>{reaction.emoji} {reaction.count}</span>
												))}
											</div>
										) : null}
									</div>
								</div>
							);
						})}
						<div ref={messagesEndRef} data-time={timeTick} />
						{!isConnected ? (
							<div className="chat-disconnected-overlay">
								<p>Connect to chat</p>
								<button type="button" onClick={onReconnect}>Reconnect</button>
							</div>
						) : null}
					</div>
					<div className="chat-input-row">
						<textarea
							ref={textareaRef}
							value={input}
							disabled={!isConnected}
							rows={1}
							placeholder="Message the team..."
							onChange={(event) => {
								setInput(event.target.value.slice(0, 500));
								resizeTextarea(event.target);
							}}
							onKeyDown={(event) => {
								event.stopPropagation();
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault();
									send();
								}
							}}
						/>
						<button type="button" onClick={send} disabled={!input.trim() || !isConnected}><SendHorizontal size={14} /></button>
					</div>
					{counter > 400 ? <small className="chat-counter">{counter}/500</small> : null}
				</>
			)}
		</section>
	);
}
