// Normalizes the value of an attribute. If the attribute is 'CELL_SAVER_ML', it rounds the value down to the nearest hundred.
export const normalizeAttribute = (value: number | string, attributeName: string): number | string => (attributeName === 'CELL_SAVER_ML' ? Math.floor(Number(value) / 100) * 100 : value);
