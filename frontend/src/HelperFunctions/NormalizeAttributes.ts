// Normalizes the value of an attribute. If the attribute is 'cell_saver_ml', it rounds the value down to the nearest hundred.
export const normalizeAttribute = (value: number | string, attributeName: string): number | string => (attributeName === 'cell_saver_ml' ? Math.floor(Number(value) / 100) * 100 : value);
