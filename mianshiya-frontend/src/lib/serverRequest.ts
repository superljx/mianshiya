import "server-only";
import { cookies } from "next/headers";
import type { ApiResponse } from "@/types/api";
import { ApiError } from "./request";

/** 服务端组件使用绝对后端地址，逐请求读取Cookie，禁止缓存用户相关响应。 */
export async function serverRequest<T>(path: string, body?: unknown): Promise<T> {
  const origin = process.env.BACKEND_ORIGIN || "http://localhost:9166";
  const response = await fetch(`${origin}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies().toString() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new ApiError(response.status, "后端服务暂不可用，请稍后重试");
  const result = await response.json() as ApiResponse<T>;
  if (!result || typeof result.code !== "number") throw new ApiError(-1, "服务返回了无效响应");
  if (result.code !== 0) throw new ApiError(result.code, result.message || "请求失败");
  return result.data;
}
