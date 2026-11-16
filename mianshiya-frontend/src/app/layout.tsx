import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "antd/dist/reset.css";
import "./globals.css";
import Providers from "./providers";
import BasicLayout from "@/components/BasicLayout";

export const metadata: Metadata = {
  title: {
    default: "面试鸭 - 程序员面试刷题平台",
    template: "%s - 面试鸭",
  },
  description: "面试鸭，帮助程序员系统学习、准备技术面试的刷题平台。", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <Providers><BasicLayout>{children}</BasicLayout></Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
