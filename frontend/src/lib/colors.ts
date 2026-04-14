/**
 * Convert HSL values to a hex color string.
 * h: 0–360, s: 0–100, l: 0–100
 */
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
    };

    return `#${f(0)}${f(8)}${f(4)}`;
}

/** Golden angle ≈ 137.508° — ensures maximally distinct successive hues */
const GOLDEN_ANGLE = 137.508;

/**
 * Returns a distinct color for a given sequential index.
 */
export function getSequentialColor(index: number): string {
    const hue = (index * GOLDEN_ANGLE) % 360;
    return hslToHex(hue, 65, 55);
}

/**
 * Deterministic fallback color based on a string key (e.g., object type name).
 */
export function getDeterministicColor(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0; // Convert to 32-bit integer
    }
    const hue = Math.abs(hash) % 360;
    return hslToHex(hue, 65, 55);
}

/**
 * Generates a complete color map for a list of keys (Object Types).
 * This ensures all types get a deterministic color assigned immediately.
 */
export function generateColorMap(keys: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    keys.forEach((key) => {
        map[key] = getDeterministicColor(key);
    });
    return map;
}
