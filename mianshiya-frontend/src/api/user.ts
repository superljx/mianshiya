import { apiRequest } from "@/lib/request";
import type { User } from "@/types/user";

export interface LoginParams {
  userAccount: string;
  userPassword: string;
}

export interface RegisterParams extends LoginParams {
  checkPassword: string;
}

export function login(params: LoginParams) {
  return apiRequest<User>({ url: "/user/login", method: "POST", data: params, skipAuthRedirect: true });
}

export function register(params: RegisterParams) {
  return apiRequest<string | number>({ url: "/user/register", method: "POST", data: params, skipAuthRedirect: true });
}

export function logout() {
  return apiRequest<boolean>({ url: "/user/logout", method: "POST", skipAuthRedirect: true });
}

export function getLoginUser() {
  return apiRequest<User>({ url: "/user/get/login", skipAuthRedirect: true });
}
