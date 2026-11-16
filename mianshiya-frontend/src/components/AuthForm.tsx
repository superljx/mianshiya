"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { login, register, type RegisterParams } from "@/api/user";
import { useAppDispatch } from "@/store/hooks";
import { setLoginUser } from "@/store/userSlice";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  const router = useRouter();

  async function onFinish(values: RegisterParams) {
    setLoading(true);
    try {
      if (isRegister) {
        await register(values);
        message.success("注册成功，请登录");
        router.push("/user/login");
      } else {
        const user = await login(values);
        dispatch(setLoginUser(user));
        message.success("登录成功");
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
        let target = "/";
        if (returnUrl) {
          const url = new URL(returnUrl, window.location.origin);
          if (url.origin === window.location.origin && !url.pathname.startsWith("/user/")) {
            target = url.pathname + url.search + url.hash;
          }
        }
        router.replace(target);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: "0 16px" }}>
      <Card>
        <Typography.Title level={2} style={{ textAlign: "center", marginTop: 0 }}>
          {isRegister ? "创建面试鸭账号" : "欢迎回到面试鸭"}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 28 }}>
          {isRegister ? "从今天开始，积累每一份进步" : "系统学习，轻松准备下一场面试"}
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="userAccount" label="账号" rules={[{ required: true, message: "请输入账号" }, { min: 4, message: "账号至少 4 位" }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入账号" autoComplete="username" size="large" maxLength={256} />
          </Form.Item>
          <Form.Item name="userPassword" label="密码" rules={[{ required: true, message: "请输入密码" }, { min: 8, message: "密码至少 8 位" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码（至少 8 位）" autoComplete={isRegister ? "new-password" : "current-password"} size="large" maxLength={128} />
          </Form.Item>
          {isRegister && (
            <Form.Item name="checkPassword" label="确认密码" dependencies={["userPassword"]} rules={[
              { required: true, message: "请再次输入密码" },
              ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue("userPassword") === value ? Promise.resolve() : Promise.reject(new Error("两次输入的密码不一致")); } }),
            ]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" autoComplete="new-password" size="large" />
            </Form.Item>
          )}
          <Form.Item><Button type="primary" htmlType="submit" size="large" block loading={loading}>{isRegister ? "注册" : "登录"}</Button></Form.Item>
        </Form>
        <div style={{ textAlign: "center" }}>
          {isRegister ? "已有账号？" : "还没有账号？"}
          <Link href={isRegister ? "/user/login" : "/user/register"} style={{ color: "#1677ff" }}>{isRegister ? "立即登录" : "立即注册"}</Link>
        </div>
      </Card>
    </div>
  );
}
