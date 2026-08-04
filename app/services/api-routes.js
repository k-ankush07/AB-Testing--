const API_KEY = import.meta.env.VITE_API_SECRET_KEY || "";

const authHeaders = (extra = {}) => ({
  "x-api-key": API_KEY,
  ...extra,
});
