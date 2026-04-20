import { http } from "@/src/shared/api/http";
import { normalizeApiError } from "@/src/shared/api/errors";

export async function apiGet<TResponse>(url: string) {
  try {
    const response = await http.get<TResponse>(url);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function apiPost<TResponse, TRequest>(url: string, data: TRequest) {
  try {
    const response = await http.post<TResponse>(url, data);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function apiPostUnknown<TRequest>(url: string, data: TRequest) {
  try {
    const response = await http.post<unknown>(url, data);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function apiPut<TResponse, TRequest>(url: string, data: TRequest) {
  try {
    const response = await http.put<TResponse>(url, data);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function apiDelete<TResponse = void>(url: string) {
  try {
    const response = await http.delete<TResponse>(url);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function apiDownloadBlob(url: string, params: Record<string, string | number | boolean | undefined>) {
  try {
    const response = await http.get<Blob>(url, {
      params,
      responseType: "blob"
    });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
