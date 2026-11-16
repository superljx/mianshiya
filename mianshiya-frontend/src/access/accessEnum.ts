const ACCESS_ENUM = {
  NOT_LOGIN: "notLogin",
  USER: "user",
  ADMIN: "admin",
} as const;

export type AccessLevel = (typeof ACCESS_ENUM)[keyof typeof ACCESS_ENUM];
export { ACCESS_ENUM };
export default ACCESS_ENUM;
