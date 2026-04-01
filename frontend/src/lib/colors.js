const palette = [
	"#007f5f",
	"#e76f51",
	"#118ab2",
	"#ef476f",
	"#2a9d8f",
	"#ff9f1c",
	"#4361ee",
	"#8d99ae"
];

/**
 * Creates a stable color from a string seed.
 * @param {string} seed - User display name or identifier.
 * @returns {string}
 */
export function getColorBySeed(seed) {
	let hash = 0;
	for (let index = 0; index < seed.length; index += 1) {
		hash = (hash << 5) - hash + seed.charCodeAt(index);
		hash |= 0;
	}
	const slot = Math.abs(hash) % palette.length;
	return palette[slot];
}
