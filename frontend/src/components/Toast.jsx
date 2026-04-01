import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";

/** @type {Array<{id: number, type: string, message: string, timeout: number}>} */
const toastStack = [];
let toastId = 0;
let rootContainer = null;

/**
 * Toast notification system
 * Renders toasts at bottom-right with auto-dismiss (3s default)
 * Max 3 visible at once
 */
const ToastContext = React.createContext(null);

/**
 * Toast display component
 */
function ToastContainer() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		window.setToastsState = setToasts;
		return () => delete window.setToastsState;
	}, []);

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} />
			))}
		</div>
	);
}

function Toast({ toast }) {
	const [isExiting, setIsExiting] = useState(false);

	const bgColor = {
		success: "bg-green-50 border-green-200",
		error: "bg-red-50 border-red-200",
		info: "bg-blue-50 border-blue-200",
		warning: "bg-amber-50 border-amber-200"
	}[toast.type];

	const textColor = {
		success: "text-green-800",
		error: "text-red-800",
		info: "text-blue-800",
		warning: "text-amber-800"
	}[toast.type];

	const iconColor = {
		success: "text-green-600",
		error: "text-red-600",
		info: "text-blue-600",
		warning: "text-amber-600"
	}[toast.type];

	const icon = {
		success: "✓",
		error: "✕",
		info: "ℹ",
		warning: "!"
	}[toast.type];

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsExiting(true);
			setTimeout(() => {
				removeToast(toast.id);
			}, 200);
		}, toast.timeout || 3000);

		return () => clearTimeout(timer);
	}, [toast.id, toast.timeout]);

	return (
		<div
			className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border
        ${bgColor} ${textColor}
        transition-all duration-200
        ${isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"}
      `}
		>
			<span className={`flex-shrink-0 font-bold ${iconColor}`}>{icon}</span>
			<p className="text-sm font-medium flex-1">{toast.message}</p>
		</div>
	);
}

/**
 * Initialize and render toast container if not already done
 */
function ensureContainerExists() {
	if (!rootContainer) {
		const container = document.createElement("div");
		container.id = "toast-root";
		document.body.appendChild(container);
		const root = createRoot(container);
		root.render(<ToastContainer />);
		rootContainer = root;
	}
}

/**
 * Add a toast and update UI
 */
function addToast(message, type = "info", timeout = 3000) {
	ensureContainerExists();

	const id = toastId++;
	const toast = { id, type, message, timeout };
	toastStack.push(toast);

	// Keep max 3 toasts visible
	if (toastStack.length > 3) {
		toastStack.shift();
	}

	if (window.setToastsState) {
		window.setToastsState([...toastStack]);
	}

	return id;
}

/**
 * Remove a specific toast
 */
function removeToast(id) {
	const index = toastStack.findIndex((t) => t.id === id);
	if (index > -1) {
		toastStack.splice(index, 1);
		if (window.setToastsState) {
			window.setToastsState([...toastStack]);
		}
	}
}

/**
 * Toast API - call these functions from anywhere in the app
 */
export const toast = {
	success: (message, timeout) => addToast(message, "success", timeout),
	error: (message, timeout) => addToast(message, "error", timeout),
	info: (message, timeout) => addToast(message, "info", timeout),
	warning: (message, timeout) => addToast(message, "warning", timeout)
};

export default ToastContainer;
