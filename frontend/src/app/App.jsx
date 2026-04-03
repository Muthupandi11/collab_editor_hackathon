import { useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import EditorPage from "../pages/EditorPage.jsx";
import { useEffect } from "react";
import { startKeepAlive } from "../utils/keepAlive.js";
import { nanoid } from "nanoid";
import ToastViewport from "../components/ui/ToastViewport.jsx";
import JoinModal from "../components/auth/JoinModal.jsx";
import { toast } from "../lib/toast.js";

/**
 * Parses URL path to fetch document room ID.
 * @returns {string}
 */
function resolveDocumentIdFromLocation() {
	const params = new URLSearchParams(window.location.search);
	const room = params.get("room");

	if (room && room.trim()) {
		return room.trim();
	}

	const generatedRoom = nanoid(8);
	params.set("room", generatedRoom);
	const nextUrl = `${window.location.pathname}?${params.toString()}`;
	window.history.replaceState({}, "", nextUrl);
	return generatedRoom;
}

function getSavedIdentity() {
	return {
		id: sessionStorage.getItem("collab_userId") || "",
		name: sessionStorage.getItem("collab_username") || "",
		color: sessionStorage.getItem("collab_color") || "",
		sound: localStorage.getItem("collab_sound") !== "off"
	};
}

export default function App() {
	const initialDocumentId = useMemo(resolveDocumentIdFromLocation, []);
	const [documentId, setDocumentId] = useState(initialDocumentId);
	const [identity, setIdentity] = useState(getSavedIdentity);
	const [showJoinModal, setShowJoinModal] = useState(() => !Boolean(getSavedIdentity().name));
	
	useEffect(() => {
		const cleanup = startKeepAlive(import.meta.env.VITE_BACKEND_URL);
		return cleanup;
	}, []);

	useEffect(() => {
		if (identity.name) {
			toast.info(`Welcome back, ${identity.name}!`, { duration: 2000 });
		}
		// run on first mount only
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleJoin = ({ username, room, color }) => {
		const userId = sessionStorage.getItem("collab_userId") || nanoid(12);
		sessionStorage.setItem("collab_userId", userId);
		sessionStorage.setItem("collab_username", username);
		sessionStorage.setItem("collab_color", color);

		if (room) {
			const params = new URLSearchParams(window.location.search);
			params.set("room", room);
			window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
			setDocumentId(room);
		}

		setIdentity((prev) => ({
			id: userId,
			name: username,
			color,
			sound: prev.sound
		}));
		setShowJoinModal(false);
	};

	return (
		<>
			{showJoinModal ? (
				<JoinModal
					initialName={identity.name}
					initialRoom={documentId}
					initialColor={identity.color}
					onSubmit={handleJoin}
				/>
			) : null}
			{!showJoinModal ? (
				<AppLayout>
					<EditorPage
						documentId={documentId}
						currentUser={{
							id: identity.id,
							name: identity.name,
							color: identity.color,
							soundEnabled: identity.sound
						}}
						onRequestIdentityEdit={() => setShowJoinModal(true)}
						onToggleSound={() => {
							setIdentity((prev) => {
								const next = { ...prev, sound: !prev.sound };
								localStorage.setItem("collab_sound", next.sound ? "on" : "off");
								return next;
							});
						}}
					/>
				</AppLayout>
			) : null}
			<ToastViewport />
		</>
	);
}
