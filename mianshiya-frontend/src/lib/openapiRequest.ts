import request, { type RequestConfig } from "./request";
import type { ApiResponse } from "@/types/api";

/** 适配 OpenAPI 生成代码的 request(url, options) 调用约定。 */
export default async function openapiRequest<T>(url: string, options: RequestConfig & { requestType?: string } = {}): Promise<T> {
  // Swagger 路径可能包含 context-path；Axios baseURL 已包含 /api。
  const path = url.replace(/^\/api(?=\/|$)/, "") || "/";
  const response = await request.request<ApiResponse<unknown>>({ ...options, url: path });
  return response.data as T;
}
