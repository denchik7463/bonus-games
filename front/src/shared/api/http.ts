import axios from "axios";
import { env } from "@/src/shared/config/env";
import { getAccessToken } from "@/src/features/auth/lib/token";

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 60_000,
  headers: {
    "Content-Type": "application/json"
  }
});

http.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const isAuthRequest = url.includes("/api/auth/login") || url.includes("/api/auth/register");
  const token = getAccessToken();
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});
