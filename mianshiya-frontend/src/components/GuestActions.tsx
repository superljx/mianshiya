"use client";

import Link from "next/link";
import { ArrowRightOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/store/hooks";

export default function GuestActions({ primaryClassName, secondaryClassName }: { primaryClassName: string; secondaryClassName: string }) {
  const { status, loginUser } = useAppSelector((state) => state.user);
  if (status !== "anonymous" || loginUser) return null;
  return <>
    <p>系统整理技术知识，认真准备每一场面试。<br />从建立自己的学习账号开始。</p>
    <Link href="/user/register" className={primaryClassName}>创建账号 <ArrowRightOutlined /></Link>
    <Link href="/user/login" className={secondaryClassName}>已有账号，去登录</Link>
  </>;
}
