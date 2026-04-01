/**
 * Logs informational messages with a timestamp.
 * @param {string} message - Human-readable log message.
 * @param {unknown} [meta] - Optional metadata payload.
 * @returns {void}
 */
export function logInfo(message, meta) {
	const payload = meta ? ` ${JSON.stringify(meta)}` : "";
	console.log(`[INFO] ${new Date().toISOString()} ${message}${payload}`);
}

/**
 * Logs error messages with a timestamp.
 * @param {string} message - Human-readable error message.
 * @param {unknown} [meta] - Optional metadata payload.
 * @returns {void}
 */
export function logError(message, meta) {
	const payload = meta ? ` ${JSON.stringify(meta)}` : "";
	console.error(`[ERROR] ${new Date().toISOString()} ${message}${payload}`);
}
