import axios, { AxiosError } from "axios";

export type ApiErrorBody = {
  code?: string;
  message?: string;
  timestamp?: string;
};

export class ApiClientError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = "UNKNOWN_ERROR", status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const status = axiosError.response?.status;
    const code = axiosError.response?.data?.code ?? statusCodeToErrorCode(status, axiosError);
    const message = axiosError.response?.data?.message ?? networkMessage(axiosError);
    return new ApiClientError(message, code, status);
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message);
  }

  return new ApiClientError("Не удалось выполнить запрос.");
}

export function getUserFriendlyError(error: unknown) {
  const normalized = normalizeApiError(error);
  const rawMessage = normalized.message.toLowerCase();

  if (normalized.code === "CONFLICT") return "Такое имя уже занято. Попробуйте другое.";
  if (rawMessage.includes("active room template for requested parameters not found") || rawMessage.includes("requested parameters not found")) {
    return "По выбранным параметрам сейчас нет подходящей комнаты. Попробуйте изменить стоимость входа, фонд или количество мест.";
  }
  if (normalized.status === 401) return "Сессия истекла или логин/пароль неверные.";
  if (normalized.status === 403) return "Недостаточно прав для этого действия.";
  if (normalized.status === 404) {
    return "Ничего не найдено.";
  }
  if (normalized.code === "NETWORK_ERROR") return "Backend сейчас недоступен. Проверьте, что сервер запущен и доступен из frontend.";
  if (normalized.code === "TIMEOUT") return "Backend слишком долго считает анализ. Попробуйте уменьшить число симуляций или повторить запрос.";
  if (normalized.code === "BACKEND_UNAVAILABLE") return "Backend не отвечает по адресу интеграции. Проверьте сервер или BACKEND_API_BASE_URL.";

  return normalized.message || "Что-то пошло не так. Попробуйте еще раз.";
}

function statusCodeToErrorCode(status: number | undefined, error?: AxiosError) {
  if (!status && error?.code === "ECONNABORTED") return "TIMEOUT";
  if (!status) return "NETWORK_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status && status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

function networkMessage(error: AxiosError) {
  if (!error.response) return "Backend сейчас недоступен.";
  return "Не удалось выполнить запрос.";
}
