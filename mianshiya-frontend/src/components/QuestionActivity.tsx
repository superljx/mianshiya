"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "antd";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/request";

/** 只在有效题目详情中挂载；每次进入记录一次，不按天去重。 */
export default function QuestionActivity({ questionId }: { questionId: string }) {
  const { status, loginUser } = useAppSelector((state) => state.user);
  const requestRef = useRef<{ key: string; promise: Promise<number> }>();
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const key = status === "authenticated" && loginUser?.id != null ? `${loginUser.id}:${questionId}` : "";

  useEffect(() => {
    if (!key) return;
    let active = true;
    // 保留同一次挂载的 Promise，避免 StrictMode effect 重放重复递增。
    // 非幂等请求不因卸载中止、不自动重试：服务端可能已成功计数。
    if (requestRef.current?.key !== key) {
      requestRef.current = {
        key,
        promise: apiRequest<number>({ url: "/user/update/active", method: "POST", skipAuthRedirect: true }),
      };
    }
    void requestRef.current.promise.catch(() => {
      if (active) setFailure({ key, message: "本次活跃记录未能确认，题目仍可正常浏览。为避免重复计数，不会自动重试。" });
    });
    return () => { active = false; };
  }, [key]);

  return failure?.key === key ? <Alert type="warning" showIcon message={failure.message} style={{ marginBottom: 16 }} /> : null;
}
