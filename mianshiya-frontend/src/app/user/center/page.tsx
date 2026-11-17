"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, Col, Result, Row, Spin, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/store/hooks";
import CalendarChart from "./components/CalendarChart";

export default function UserCenterPage() {
  const { loginUser, status } = useAppSelector((state) => state.user);
  const router = useRouter();
  useEffect(() => {
    if (status === "anonymous") router.replace("/user/login?returnUrl=%2Fuser%2Fcenter");
  }, [status, router]);

  if (status === "error") return <Result status="warning" title="暂时无法确认登录状态" extra={<Button onClick={() => window.location.reload()}>重新加载</Button>} />;
  if (status !== "authenticated" || !loginUser) return <div className="loading-state"><Spin tip="正在确认登录状态"><div style={{ padding: 48 }} /></Spin></div>;

  return <main className="page-container">
    <h1 className="page-title">个人中心</h1>
    <Row gutter={[24, 24]}>
      <Col xs={24} md={6}>
        <Card style={{ textAlign: "center", height: "100%" }}>
          <Avatar size={80} src={loginUser.userAvatar || undefined} icon={<UserOutlined />} />
          <Typography.Title level={4}>{loginUser.userName || "用户"}</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ overflowWrap: "anywhere" }}>{loginUser.userProfile || "这个人很忙，还没有填写个人简介。"}</Typography.Paragraph>
        </Card>
      </Col>
      <Col xs={24} md={18} style={{ minWidth: 0 }}>
        <Card tabList={[{ key: "record", label: "刷题记录" }]} activeTabKey="record">
          <CalendarChart key={String(loginUser.id)} userId={String(loginUser.id)} />
        </Card>
      </Col>
    </Row>
  </main>;
}
