"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { App, Avatar, Button, Dropdown, Result, Spin, Alert } from "antd";
import { ProLayout, type MenuDataItem } from "@ant-design/pro-components";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { menus } from "../../config/menus";
import checkAccess from "@/access/checkAccess";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearLoginUser } from "@/store/userSlice";
import { logout } from "@/api/user";
import "./layout.css";

export default function BasicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loginUser, status } = useAppSelector((state) => state.user);
  const { message } = App.useApp();
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoading = status === "idle" || status === "loading";

  useEffect(() => {
    if (isAdminPage && status === "anonymous") {
      router.replace(`/user/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAdminPage, status, pathname, router]);

  async function handleLogout() {
    try {
      await logout();
      dispatch(clearLoginUser());
      message.success("已退出登录");
      router.push("/");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "退出失败");
    }
  }

  function filterMenus(items: MenuDataItem[]): MenuDataItem[] {
    return items.filter((item) => checkAccess(loginUser, item.access)).map((item) => ({
      ...item, children: item.children ? filterMenus(item.children) : undefined,
    }));
  }

  let content = children;
  if (isAdminPage) {
    if (isLoading || status === "anonymous") content = <div className="loading-state"><Spin tip="正在确认登录状态"><div style={{ padding: 48 }} /></Spin></div>;
    else if (status === "error") content = <Result status="warning" title="暂时无法确认登录状态" subTitle="请确认后端服务已启动，刷新页面后重试。" extra={<Button onClick={() => window.location.reload()}>重新加载</Button>} />;
    else if (loginUser?.userRole !== "admin") content = <Result status="403" title="无权访问" subTitle="该页面仅限管理员使用。" extra={<Link href="/"><Button type="primary">返回主页</Button></Link>} />;
  }

  return (
    <div id="basicLayout" className="basic-layout">
      <ProLayout
        title="面试鸭"
        logo={<span className="brand-mark">鸭</span>}
        layout="top"
        location={{ pathname }}
        route={{ routes: filterMenus(menus) }}
        menu={{ locale: false }}
        contentWidth="Fluid"
        onMenuHeaderClick={() => router.push("/")}
        menuItemRender={(item, dom) => item.path && !item.children ? (
          /^https?:\/\//.test(item.path)
            ? <a href={item.path} target="_blank" rel="noopener noreferrer">{dom}</a>
            : <Link href={item.path}>{dom}</Link>
        ) : dom}
        actionsRender={() => [<div key="user" className="header-user">
          {isLoading ? <Spin size="small" /> : loginUser ? (
            <Dropdown menu={{ items: [{ key: "logout", icon: <LogoutOutlined />, label: "退出登录", onClick: handleLogout }] }}>
              <Button type="text"><Avatar size="small" src={loginUser.userAvatar || undefined} icon={<UserOutlined />} />{loginUser.userName || "用户"}</Button>
            </Dropdown>
          ) : <Link href="/user/login"><Button type="primary">登录</Button></Link>}
        </div>]}
        footerRender={() => <footer className="global-footer">© {new Date().getFullYear()} 面试鸭 · 程序员面试刷题平台</footer>}
      >
        <div className="global-content">
          {status === "error" && !isAdminPage && <Alert className="connection-alert" type="warning" showIcon message="后端服务暂不可用，登录状态未能加载；你仍可浏览公开页面。" />}
          {content}
        </div>
      </ProLayout>
    </div>
  );
}
