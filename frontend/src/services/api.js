import axios from "axios";

// Central axios instance. All API calls go through here so we have a single
// place to attach the JWT token and base URL. The "/api" prefix is proxied to
// the Django backend by Vite during development.
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Where we keep the access token in the browser. (localStorage is fine for a
// student project; a production app would prefer httpOnly cookies.)
export const TOKEN_KEY = "swasthya_access";
export const REFRESH_KEY = "swasthya_refresh";
export const USER_KEY = "swasthya_user";

// Before every request, attach the token if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
