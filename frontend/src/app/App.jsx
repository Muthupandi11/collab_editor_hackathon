import { useMemo } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import EditorPage from "../pages/EditorPage.jsx";
import { getColorBySeed } from "../lib/colors.js";
import { useEffect } from "react";
import { startKeepAlive } from "../utils/keepAlive.js";

/**
 * Parses URL path to fetch document room ID.
 * @returns {string}
 */
function resolveDocumentIdFromLocation() {
	const segments = window.location.pathname.split("/").filter(Boolean);
	if (segments[0] === "doc" && segments[1]) {
		return segments[1];
	}
	return "demo-room";
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
		const cleanup = startKeepAlive();
		return cleanup;
	}, []);

	return (
		<AppLayout documentId={documentId}>
			<EditorPage documentId={documentId} currentUser={currentUser} />
		</AppLayout>
	);
}
