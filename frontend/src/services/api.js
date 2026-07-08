import axios from "axios";

// Central axios instance. All API calls go through here so we have a single
// place to attach the JWT token and base URL later. The "/api" prefix is
// proxied to the Django backend by Vite during development.
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
