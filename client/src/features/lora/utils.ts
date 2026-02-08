export const normalizePath = (p: string) => p.replace(/\\/g, '/');

export const isSamePath = (p1: string, p2: string) => {
    if (!p1 || !p2) return false;
    return normalizePath(p1).toLowerCase() === normalizePath(p2).toLowerCase();
};

export const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIdx = 0;
    while (size >= 1024 && unitIdx < units.length - 1) {
        size /= 1024;
        unitIdx++;
    }
    return `${size.toFixed(1)}${units[unitIdx]}`;
};
