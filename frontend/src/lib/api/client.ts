import { ApiResponse, HealthCheckData } from '@/types/api';

export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errorCode: string = 'UNKNOWN_ERROR',
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const nameLenPlus = name.length + 1;
  const cookies = document.cookie ? document.cookie.split(';') : [];

  for (const cookieItem of cookies) {
    const trimmed = cookieItem.trim();
    if (trimmed.substring(0, nameLenPlus) === `${name}=`) {
      return decodeURIComponent(trimmed.substring(nameLenPlus));
    }
  }

  return null;
}

export async function ensureCsrfCookie(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `فشل الحصول على ملف تعريف ارتباط CSRF (HTTP ${response.status})`,
        response.status,
        'CSRF_INIT_FAILED'
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('تعذر الاتصال بالخادم الخلفي', 0, 'NETWORK_ERROR');
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (typeof document !== 'undefined' && isMutating) {
    if (!getCookie('XSRF-TOKEN')) {
      await ensureCsrfCookie();
    }
    const token = getCookie('XSRF-TOKEN');
    if (token) {
      headers['X-XSRF-TOKEN'] = token;
    }
  }

  let bodyPayload: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      bodyPayload = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      bodyPayload = JSON.stringify(options.body);
    }
  }

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : endpoint.startsWith('/sanctum/')
      ? `${BACKEND_URL}${endpoint}`
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
      body: bodyPayload,
    });
  } catch {
    throw new ApiError('تعذر الوصول إلى الخادم الخلفي', 0, 'NETWORK_ERROR');
  }

  let payload: ApiResponse<T>;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      response.statusText || 'استجابة غير متوقعة من الخادم',
      response.status,
      response.status === 503 ? 'DATABASE_ERROR' : 'INVALID_RESPONSE'
    );
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message || 'حدث خطأ أثناء معالجة الطلب',
      response.status,
      payload.error_code || 'HTTP_ERROR',
      payload.errors
    );
  }

  return payload;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export async function checkApiHealth(): Promise<ApiResponse<HealthCheckData>> {
  return api.get<HealthCheckData>('/health');
}

