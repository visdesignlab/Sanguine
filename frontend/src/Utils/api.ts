const API_BASE_PATH = '/api/';

export function apiPath(path: string): string {
  return `${API_BASE_PATH}${path.replace(/^\/+/, '')}`;
}
