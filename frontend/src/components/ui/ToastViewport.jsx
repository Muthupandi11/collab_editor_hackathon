import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, TriangleAlert, X } from "lucide-react";
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
					<span className="toast-icon">
						{toast.type === "success" ? <CheckCircle2 size={16} /> : null}
						{toast.type === "error" ? <AlertCircle size={16} /> : null}
						{toast.type === "info" ? <Info size={16} /> : null}
						{toast.type === "warning" ? <TriangleAlert size={16} /> : null}
					</span>
					<p>{toast.message}</p>
					<button type="button" className="toast-close" onClick={() => dismissToast(toast.id)}>
						<X size={14} />
					</button>
				</div>
			))}
		</div>
	);
}
