const listeners = new Set();
let queue = [];
let idSeed = 1;
const MAX_TOASTS = 3;
const DURATION = {
	success: 2500,
	error: 4000,
	info: 3000,
	warning: 3500
};

function notify() {
	listeners.forEach((listener) => listener(queue));
}

/**
 * Subscribes to toast changes.
 * @param {(toasts: Array<{id:number,type:string,message:string}>) => void} listener - Subscriber callback.
 * @returns {() => void}
 */
export function subscribeToToasts(listener) {
	listeners.add(listener);
	listener(queue);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Dismisses a toast by id.
 * @param {number} id - Toast id.
 * @returns {void}
 */
export function dismissToast(id) {
	queue = queue.filter((toast) => toast.id !== id);
	notify();
}

function addToast(type, message) {
	if (queue.some((toast) => toast.type === type && toast.message === message)) {
		return;
	}

	const id = idSeed++;
	queue = [...queue, { id, type, message }].slice(-MAX_TOASTS);
	notify();
	setTimeout(() => dismissToast(id), DURATION[type] || 3000);
}

/**
 * Global toast helper methods.
 */
export const toast = {
	success(message) {
		addToast("success", message);
	},
	error(message) {
		addToast("error", message);
	},
	info(message) {
		addToast("info", message);
	},
	warning(message) {
		addToast("warning", message);
	}
};
