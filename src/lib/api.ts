const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const TOKEN_STORAGE_KEY = "ims_auth_token";

type RequestOptions = RequestInit & {
  token?: string | null;
};

export function getStoredAuthToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token = getStoredAuthToken(), headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed");
  }

  return data as T;
}

export async function apiDownload(path: string, fallbackFilename: string, options: RequestOptions = {}) {
  const { token = getStoredAuthToken(), headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;
    throw new Error(data?.message ?? "Download failed");
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition");
  const matchedFilename = contentDisposition?.match(/filename="([^"]+)"/i)?.[1];
  const filename = matchedFilename ?? fallbackFilename;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
