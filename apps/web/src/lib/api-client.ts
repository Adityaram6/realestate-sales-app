import axios, { AxiosError, type AxiosInstance } from "axios";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";
import { installMockAdapter } from "@/mocks/adapter";

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

if (env.useMock) {
  installMockAdapter(apiClient);
}

export interface ApiErrorShape {
  message: string;
  statusCode: number;
  code?: string;
}

export function extractApiError(err: unknown): ApiErrorShape {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Partial<ApiErrorShape> | undefined;
    return {
      message: data?.message ?? err.message ?? "Unexpected error",
      statusCode: err.response?.status ?? 500,
      code: data?.code,
    };
  }
  return {
    message: err instanceof Error ? err.message : "Unexpected error",
    statusCode: 500,
  };
}
