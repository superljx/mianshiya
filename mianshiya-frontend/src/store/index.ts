import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import type { User } from "@/types/user";

/** 每个 Provider 实例各自创建 store，避免服务端请求之间共享登录用户。 */
export function makeStore(initialUser?: User | null) {
  return configureStore({
    reducer: { user: userReducer },
    preloadedState: {
      user: {
        loginUser: initialUser ?? null,
        status: initialUser === undefined
          ? "idle" as const
          : initialUser === null
            ? "anonymous" as const
            : "authenticated" as const,
      },
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export { setLoginUser, setLoginStatus, clearLoginUser } from "./userSlice";
export type { LoginStatus, UserState } from "./userSlice";
