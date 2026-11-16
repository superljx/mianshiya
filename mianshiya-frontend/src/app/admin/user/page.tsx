"use client";

import { useEffect, useRef, useState } from "react";
import {
  App, Avatar, Button, Card, Form, Input, Modal, Popconfirm,
  Select, Space, Table, Tag, Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { apiRequest } from "@/lib/request";
import type { User } from "@/types/user";

interface UserPage {
  records: User[];
  total: number;
  current: number;
  size: number;
}

interface UserQuery {
  id?: string;
  userName?: string;
  userRole?: string;
}

interface UserFormValues {
  userAccount?: string;
  userName: string;
  userAvatar?: string;
  userProfile?: string;
  userRole: string;
}

const roleOptions = [
  { label: "普通用户", value: "user" },
  { label: "管理员", value: "admin" },
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

export default function AdminUserPage() {
  const { message } = App.useApp();
  const [queryForm] = Form.useForm<UserQuery>();
  const [editForm] = Form.useForm<UserFormValues>();
  const [query, setQuery] = useState<UserQuery>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<User["id"]>(undefined);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void apiRequest<UserPage>({
      url: "/user/list/page",
      method: "POST",
      data: { ...query, current: pagination.current, pageSize: pagination.pageSize },
      signal: controller.signal,
    }).then((page) => {
      if (controller.signal.aborted) return;
      setUsers(page.records ?? []);
      setTotal(Number(page.total) || 0);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setUsers([]);
      setTotal(0);
      void message.error(errorMessage(error));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [query, pagination, refreshKey, message]);

  function openEditor(user: User | null) {
    setEditingUser(user);
    editForm.resetFields();
    editForm.setFieldsValue({
      userAccount: user?.userAccount ?? "",
      userName: user?.userName ?? "",
      userAvatar: user?.userAvatar ?? "",
      userProfile: user?.userProfile ?? "",
      userRole: user?.userRole ?? "user",
    });
    setModalOpen(true);
  }

  async function saveUser(values: UserFormValues) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (editingUser) {
        await apiRequest<boolean>({
          url: "/user/update", method: "POST",
          data: {
            id: editingUser.id, userName: values.userName,
            userAvatar: values.userAvatar, userProfile: values.userProfile,
            userRole: values.userRole,
          },
        });
      } else {
        await apiRequest<string | number>({
          url: "/user/add", method: "POST",
          data: {
            userAccount: values.userAccount, userName: values.userName,
            userAvatar: values.userAvatar, userRole: values.userRole,
          },
        });
      }
      void message.success(editingUser ? "用户已更新" : "用户已新增");
      setModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      void message.error(errorMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function deleteUser(id: User["id"]) {
    if (id === undefined || deletingRef.current) return;
    deletingRef.current = true;
    setDeletingId(id);
    try {
      await apiRequest<boolean>({ url: "/user/delete", method: "POST", data: { id } });
      void message.success("用户已删除");
      if (users.length === 1 && pagination.current > 1) {
        setPagination((previous) => ({ ...previous, current: previous.current - 1 }));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (error: unknown) {
      void message.error(errorMessage(error));
    } finally {
      deletingRef.current = false;
      setDeletingId(undefined);
    }
  }

  const columns: TableColumnsType<User> = [
    { title: "ID", dataIndex: "id", width: 190 },
    { title: "账号", dataIndex: "userAccount", width: 150, render: (value: string | undefined) => value || "—" },
    { title: "用户名", dataIndex: "userName", width: 150 },
    { title: "头像", dataIndex: "userAvatar", width: 80, render: (value: string | undefined) => <Avatar src={value}>用户</Avatar> },
    { title: "简介", dataIndex: "userProfile", width: 240, ellipsis: true },
    {
      title: "角色", dataIndex: "userRole", width: 110,
      render: (role: string | undefined) => <Tag color={role === "admin" ? "gold" : "blue"}>{roleOptions.find((item) => item.value === role)?.label ?? role ?? "未设置"}</Tag>,
    },
    { title: "创建时间", dataIndex: "createTime", width: 200 },
    { title: "更新时间", dataIndex: "updateTime", width: 200 },
    {
      title: "操作", key: "actions", fixed: "right", width: 150,
      render: (_, user) => (
        <Space>
          <Button type="link" size="small" disabled={user.id === undefined} onClick={() => openEditor(user)}>编辑</Button>
          <Popconfirm title="确定删除该用户？" description="删除后无法恢复，请确认用户信息。" okText="删除" cancelText="取消" onConfirm={() => deleteUser(user.id)}>
            <Button type="link" size="small" danger loading={deletingId !== undefined && deletingId === user.id} disabled={user.id === undefined || deletingId !== undefined}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={2} style={{ margin: 0 }}>用户管理</Typography.Title>
      <Card>
        <Form form={queryForm} layout="inline" onFinish={(values) => {
          setQuery({ id: values.id?.trim() || undefined, userName: values.userName?.trim() || undefined, userRole: values.userRole });
          setPagination((previous) => ({ ...previous, current: 1 }));
        }} style={{ rowGap: 16 }}>
          <Form.Item label="ID" name="id" rules={[{ pattern: /^\d*$/, message: "请输入数字 ID" }]}><Input allowClear placeholder="用户 ID" /></Form.Item>
          <Form.Item label="用户名" name="userName"><Input allowClear placeholder="请输入用户名" /></Form.Item>
          <Form.Item label="角色" name="userRole"><Select allowClear placeholder="全部角色" options={roleOptions} style={{ width: 130 }} /></Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => { queryForm.resetFields(); setQuery({}); setPagination((previous) => ({ ...previous, current: 1 })); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Card title="用户列表" extra={<Space><Button icon={<ReloadOutlined />} onClick={() => setRefreshKey((value) => value + 1)} loading={loading}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>新增用户</Button></Space>}>
        <Table<User>
          rowKey={(user) => String(user.id)} columns={columns} dataSource={users}
          loading={loading} scroll={{ x: 1500 }}
          pagination={{ ...pagination, total, showSizeChanger: true, showTotal: (count) => `共 ${count} 位用户`, onChange: (current, pageSize) => setPagination({ current, pageSize }) }}
        />
      </Card>
      <Modal title={editingUser ? "编辑用户" : "新增用户"} open={modalOpen} forceRender confirmLoading={saving} maskClosable={!saving} closable={!saving} cancelButtonProps={{ disabled: saving }} okText="保存" cancelText="取消" onCancel={() => { if (!saving) setModalOpen(false); }} onOk={() => editForm.submit()}>
        <Form form={editForm} layout="vertical" onFinish={saveUser} disabled={saving}>
          {!editingUser && <Form.Item label="账号" name="userAccount" rules={[{ required: true, whitespace: true, message: "请输入账号" }, { min: 4, message: "账号至少 4 个字符" }]}><Input autoComplete="off" /></Form.Item>}
          <Form.Item label="用户名" name="userName" rules={[{ required: true, whitespace: true, message: "请输入用户名" }]}><Input /></Form.Item>
          <Form.Item label="头像地址" name="userAvatar" rules={[{ type: "url", message: "请输入有效的头像 URL" }]}><Input placeholder="https://..." /></Form.Item>
          {editingUser && <Form.Item label="简介" name="userProfile"><Input.TextArea rows={3} /></Form.Item>}
          <Form.Item label="角色" name="userRole" rules={[{ required: true, message: "请选择角色" }]}><Select options={roleOptions} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
