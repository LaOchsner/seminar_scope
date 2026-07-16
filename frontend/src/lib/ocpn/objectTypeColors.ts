import { getDeterministicColor } from '~/lib/colors';

export const blendedConicGradient = (colors: string[]) => {
    if (colors.length <= 1) return colors[0] ?? '#64748b';

    const segment = 100 / colors.length;
    const blend = Math.min(4, segment * 0.22);
    const stops = colors.flatMap((color, index) => {
        const start = index * segment;
        const end = (index + 1) * segment;
        return [`${color} ${start + blend}%`, `${color} ${end - blend}%`];
    });

    return `conic-gradient(${stops.join(', ')})`;
};

export const splitObjectTypeLabel = (type: string) =>
    type
        .split(/\s*\+\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

export const getObjectTypeColors = (type: string, colorMap: Record<string, string>) => {
    const parts = splitObjectTypeLabel(type);
    const types = parts.length > 0 ? parts : [type];
    return types.map((part) => colorMap[part] || colorMap[type] || getDeterministicColor(part));
};

export const getObjectTypeBackground = (type: string, colorMap: Record<string, string>) =>
    blendedConicGradient(getObjectTypeColors(type, colorMap));
