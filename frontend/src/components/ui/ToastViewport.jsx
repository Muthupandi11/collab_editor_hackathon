import { useEffect, useState } from "react";
import { subscribeToToasts, dismissToast } from "../../lib/toast.js";

/**
 * Renders stacked toast notifications.
 * @returns {JSX.Element | null}
 */
export default function ToastViewport() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		const unsubscribe = subscribeToToasts(setToasts);
		return unsubscribe;
	}, []);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div className="toast-viewport" aria-live="polite" aria-atomic="true">
			{toasts.map((toast) => (
				<div key={toast.id} className={`toast toast-${toast.type}`}>
					<p>{toast.message}</p>
					<button type="button" onClick={() => dismissToast(toast.id)}>
						Dismiss
					</button>
				</div>
			))}
		</div>
	);
}
