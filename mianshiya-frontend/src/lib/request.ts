import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ApiResponse } from "@/types/api";

export interface RequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  /** 初始化当前用户或登录时关闭自动跳转，交由调用方处理匿名状态。 */
  skipAuthRedirect?: boolean;
}

export class ApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message || "请求失败");
    this.name = "ApiError";
    this.code = code;
  }
}

let redirectingToLogin = false;

function redirectToLogin() {
  if (typeof window === "undefined" || redirectingToLogin) return;
  if (window.location.pathname.replace(/\/$/, "") === "/user/login") return;

  const returnUrl = new URL(window.location.href);
  if (returnUrl.origin !== window.location.origin) return;
  const loginUrl = new URL("/user/login", window.location.origin);
  const returnPath = returnUrl.pathname + returnUrl.search + returnUrl.hash;
  loginUrl.searchParams.set("returnUrl", returnPath.startsWith("//") ? "/" : returnPath);
  redirectingToLogin = true;
  window.location.assign(loginUrl.href);
}

/** 保留 AxiosResponse 结构；需直接获得业务 data 时使用 apiRequest。 */
export const request = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  timeout: 10000,
  withCredentials: true,
});

request.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    const body = response.data;
    if (
      !body || typeof body !== "object" ||
      !("code" in body) || typeof body.code !== "number" || !Number.isFinite(body.code) ||
      !("message" in body) || typeof body.message !== "string" ||
      (body.code === 0 && !("data" in body))
    ) {
      return Promise.reject(new ApiError(-1, "服务返回了无效响应"));
    }
    if (body.code !== 0) {
      if (body.code === 40100 && !(response.config as RequestConfig).skipAuthRedirect) {
        redirectToLogin();
      }
      return Promise.reject(new ApiError(body.code, body.message));
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (!(error.config as RequestConfig | undefined)?.skipAuthRedirect) {
        redirectToLogin();
      }
      return Promise.reject(new ApiError(40100, "请先登录"));
    }
    return Promise.reject(error);
  },
);

/** 示例：apiRequest<User>({ url: "/user/get/login", skipAuthRedirect: true })。 */
export async function apiRequest<T, D = unknown>(config: RequestConfig<D>): Promise<T> {
  const response = await request.request<ApiResponse<T>, AxiosResponse<ApiResponse<T>>, D>(config);
  return response.data.data;
}

export type { ApiResponse } from "@/types/api";
export default request;
