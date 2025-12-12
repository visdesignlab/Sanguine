import { Layout } from 'react-grid-layout';

/**
 * Robust comparison to avoid redundant updates from reactive grid layout
 * Checks if two layout arrays are effectively equal regardless of order
 */
export const areLayoutsEqual = (l1: Layout[], l2: Layout[]) => {
    if (l1.length !== l2.length) return false;
    // Sort by 'i' to ensure order doesn't matter for comparison
    const sorted1 = [...l1].sort((a, b) => a.i.localeCompare(b.i));
    const sorted2 = [...l2].sort((a, b) => a.i.localeCompare(b.i));

    return sorted1.every((item, index) => {
        const other = sorted2[index];
        return item.i === other.i &&
            item.x === other.x &&
            item.y === other.y &&
            item.w === other.w &&
            item.h === other.h;
    });
};

/**
 * Helper to compact layout (simple vertical compaction)
 */
export const compactLayout = (layout: Layout[], cols: number): Layout[] => {
    // Sort by y, then x
    const sorted = [...layout].sort((a, b) => {
        if (a.y === b.y) return a.x - b.x;
        return a.y - b.y;
    });

    const heightMap = new Array(cols).fill(0);

    return sorted.map(item => {
        const newItem = { ...item };
        // Find max height in the columns this item occupies
        let maxY = 0;
        for (let i = newItem.x; i < newItem.x + newItem.w; i++) {
            if (i < cols) {
                maxY = Math.max(maxY, heightMap[i]);
            }
        }

        newItem.y = maxY;

        // Update height map
        for (let i = newItem.x; i < newItem.x + newItem.w; i++) {
            if (i < cols) {
                heightMap[i] = maxY + newItem.h;
            }
        }
        return newItem;
    });
};
