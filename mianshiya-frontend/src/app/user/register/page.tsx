import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "用户注册" };
export default function RegisterPage() { return <AuthForm mode="register" />; }
