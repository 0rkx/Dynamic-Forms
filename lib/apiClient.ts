import { supabase } from './supabase';

const _env = (import.meta as any).env ?? {};
const DEFAULT_API_BASE_URL = 'https://dynamic-forms.owaisrazakhan242.workers.dev';
const configuredApiBaseUrl = typeof _env.VITE_API_URL === 'string' ? _env.VITE_API_URL.trim() : '';
const API_BASE_URL: string = (configuredApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');

interface APIErrorBody {
  error: string;
  message: string;
}

class APIRequestError extends Error {
  constructor(public status: number, public errorData: APIErrorBody) {
    super(errorData.message);
    this.name = 'APIRequestError';
  }
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers as Record<string, string>;
}

function handleAPIError(error: unknown): never {
  if (error instanceof APIRequestError) {
    throw new Error(error.errorData.message);
  }

  if (error instanceof Error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    }

    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled. Please try again.');
    }
  }

  throw new Error('Something went wrong. Please try again in a moment.');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...normalizeHeaders(options.headers),
    };

    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'An unexpected error occurred',
      }));
      throw new APIRequestError(response.status, errorData);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    handleAPIError(error);
  }
}
