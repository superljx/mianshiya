"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { Provider } from "react-redux";
import { makeStore, setLoginStatus, setLoginUser, type AppStore } from "@/store";
import { apiRequest, ApiError } from "@/lib/request";
import type { User } from "@/types/user";

interface ProvidersProps {
  children: ReactNode;
  initialUser?: User | null;
}

function AuthBootstrap({ store }: { store: AppStore }) {
  useEffect(() => {
    if (store.getState().user.status !== "idle") return;
    const controller = new AbortController();
    store.dispatch(setLoginStatus("loading"));

    void apiRequest<User>({
      url: "/user/get/login",
      skipAuthRedirect: true,
      signal: controller.signal,
    })
      .then((user) => {
        if (!controller.signal.aborted && store.getState().user.status === "loading") {
          store.dispatch(setLoginUser(user));
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && store.getState().user.status === "loading") {
          store.dispatch(setLoginStatus(
            error instanceof ApiError && error.code === 40100 ? "anonymous" : "error",
          ));
        }
      });

    return () => {
      controller.abort();
      // 恢复可初始化状态，使 StrictMode 的下一次 effect 能重新发起请求。
      if (store.getState().user.status === "loading") {
        store.dispatch(setLoginStatus("idle"));
      }
    };
  }, [store]);

  return null;
}

export default function Providers({ children, initialUser }: ProvidersProps) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore(initialUser);
  }

  return (
    <Provider store={storeRef.current}>
      <AuthBootstrap store={storeRef.current} />
      <ConfigProvider locale={zhCN}>
        <App>{children}</App>
      </ConfigProvider>
    </Provider>
  );
}

export { useAppDispatch, useAppSelector } from "@/store/hooks";
