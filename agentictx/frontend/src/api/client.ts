import axios from "axios";
import type { ResponseEnvelope } from "@/types";

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export async function get<T>(url: string): Promise<T> {
  const res = await apiClient.get<ResponseEnvelope<T>>(url);
  if (res.data.error) throw new Error(res.data.error);
  return res.data.data as T;
}

export async function post<T, B = unknown>(url: string, body: B): Promise<T> {
  const res = await apiClient.post<ResponseEnvelope<T>>(url, body);
  if (res.data.error) throw new Error(res.data.error);
  return res.data.data as T;
}

export async function patch<T, B = unknown>(url: string, body: B): Promise<T> {
  const res = await apiClient.patch<ResponseEnvelope<T>>(url, body);
  if (res.data.error) throw new Error(res.data.error);
  return res.data.data as T;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<ResponseEnvelope<T>>(url, body ?? {});
  if (res.data.error) throw new Error(res.data.error);
  return res.data.data as T;
}

export async function del<T = void>(url: string): Promise<T> {
  const res = await apiClient.delete<ResponseEnvelope<T> | "">(url);
  if (typeof res.data === "object" && res.data !== null && "data" in res.data) {
    if (res.data.error) throw new Error(res.data.error);
    return res.data.data as T;
  }
  return undefined as T;
}
