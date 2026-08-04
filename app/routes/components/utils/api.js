const API_KEY = import.meta.env.VITE_API_SECRET_KEY || "";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const authHeaders = (extra = {}) => ({
  "x-api-key": API_KEY,
  "Content-Type": "application/json",
  ...extra,
});

export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function apiGet(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const fullPath = query ? `${path}?${query}` : path;

  return apiRequest(fullPath, {
    method: "GET",
  });
}

export async function apiDelete(path) {
  return apiRequest(path, { method: "DELETE" });
}

export async function apiPatch(path, body) {
  return apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiPut(path, body) {
  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiPost(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}