import type { User } from "@/types/user";
import ACCESS_ENUM, { type AccessLevel } from "./accessEnum";

/** 仅供前端展示与导航控制，后端仍须独立验证权限。 */
export function checkAccess(user: User | null | undefined, needAccess: AccessLevel = ACCESS_ENUM.NOT_LOGIN): boolean {
  if (needAccess === ACCESS_ENUM.NOT_LOGIN) return true;
  if (!user || !user.userRole || user.userRole === ACCESS_ENUM.NOT_LOGIN) return false;
  if (needAccess === ACCESS_ENUM.USER) return true;
  return user.userRole === ACCESS_ENUM.ADMIN;
}

export default checkAccess;
