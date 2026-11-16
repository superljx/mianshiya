import ACCESS_ENUM, { type AccessLevel } from "./accessEnum";

export const ROUTE_ACCESS: Readonly<Record<string, AccessLevel>> = {
  "/admin": ACCESS_ENUM.ADMIN,
};

/** 按完整路径段匹配，避免 /administrator 被误判为 /admin 子路由。 */
export function getRouteAccess(pathname: string): AccessLevel {
  const matchedPath = Object.keys(ROUTE_ACCESS)
    .sort((left, right) => right.length - left.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));
  return matchedPath ? ROUTE_ACCESS[matchedPath] : ACCESS_ENUM.NOT_LOGIN;
}
