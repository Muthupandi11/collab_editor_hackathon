import { useMemo } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import EditorPage from "../pages/EditorPage.jsx";
import { getColorBySeed } from "../lib/colors.js";
import { useEffect } from "react";
import { startKeepAlive } from "../utils/keepAlive.js";
import { nanoid } from "nanoid";
import ToastViewport from "../components/ui/ToastViewport.jsx";

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

/**
 * Generates a local fallback display name.
 * @returns {string}
 */
function generateGuestName() {
	const suffix = Math.floor(1000 + Math.random() * 9000);
	return `Guest-${suffix}`;
}

export default function App() {
	const documentId = useMemo(resolveDocumentIdFromLocation, []);
	const currentUser = useMemo(() => {
		const name = generateGuestName();
		return {
			name,
			color: getColorBySeed(name)
		};
	}, []);
	
	useEffect(() => {
		const cleanup = startKeepAlive(import.meta.env.VITE_BACKEND_URL);
		return cleanup;
	}, []);

	return (
		<>
			<AppLayout documentId={documentId}>
				<EditorPage documentId={documentId} currentUser={currentUser} />
			</AppLayout>
			<ToastViewport />
		</>
	);
}
