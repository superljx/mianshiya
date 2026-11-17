"use client";

import { useEffect, useRef, useState } from "react";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { apiRequest } from "@/lib/request";
import BankCoverInput, { isBankCoverUrl } from "@/components/BankCoverInput";

export default function AdminBankPage() {
  const { message } = App.useApp();
  const [queryForm] = Form.useForm<API.QuestionBankQueryRequest>();
  const [editForm] = Form.useForm<API.QuestionBankAddRequest>();
  const [query, setQuery] = useState<API.QuestionBankQueryRequest>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [records, setRecords] = useState<API.QuestionBank[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<API.QuestionBank | null>(null);
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverBusyRef = useRef(false);
  const [deletingId, setDeletingId] = useState<number>();
  const savingRef = useRef(false);
  const deletingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void apiRequest<API.PageQuestionBank_>({
      url: "/questionBank/list/page", method: "POST", data: { ...query, ...pagination }, signal: controller.signal,
    }).then((page) => {
      if (controller.signal.aborted) return;
      setRecords(page.records ?? []);
      setTotal(Number(page.total) || 0);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setRecords([]);
      setTotal(0);
      void message.error(error instanceof Error ? error.message : "加载题库失败");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, pagination, refreshKey, message]);

  function openEditor(bank: API.QuestionBank | null) {
    setEditing(bank);
    editForm.resetFields();
    editForm.setFieldsValue({ title: bank?.title ?? "", description: bank?.description ?? "", picture: bank?.picture ?? "" });
    setOpen(true);
  }

  async function save(values: API.QuestionBankAddRequest) {
    if (savingRef.current || coverBusyRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const data: API.QuestionBankUpdateRequest = { ...values, title: values.title?.trim(), ...(editing ? { id: editing.id } : {}) };
      if (editing) {
        const updated = await apiRequest<boolean>({ url: "/questionBank/update", method: "POST", data });
        if (!updated) throw new Error("题库未更新，请刷新后重试");
      } else {
        await apiRequest<number>({ url: "/questionBank/add", method: "POST", data });
      }
      void message.success(editing ? "题库已更新" : "题库已新增");
      setOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      void message.error(error instanceof Error ? error.message : "保存题库失败");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function remove(id: number | undefined) {
    if (id === undefined || deletingRef.current) return;
    deletingRef.current = true;
    setDeletingId(id);
    try {
      const deleted = await apiRequest<boolean>({ url: "/questionBank/delete", method: "POST", data: { id } satisfies API.DeleteRequest });
      if (!deleted) throw new Error("题库未删除，请刷新后重试");
      void message.success("题库已删除");
      if (records.length === 1 && pagination.current > 1) setPagination((value) => ({ ...value, current: value.current - 1 }));
      else setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      void message.error(error instanceof Error ? error.message : "删除题库失败");
    } finally {
      deletingRef.current = false;
      setDeletingId(undefined);
    }
  }

  const columns: TableColumnsType<API.QuestionBank> = [
    { title: "ID", dataIndex: "id", width: 190 },
    { title: "标题", dataIndex: "title", width: 200, ellipsis: true },
    { title: "描述", dataIndex: "description", width: 280, ellipsis: true },
    { title: "图片地址", dataIndex: "picture", width: 220, ellipsis: true },
    { title: "创建人 ID", dataIndex: "userId", width: 190 },
    { title: "创建时间", dataIndex: "createTime", width: 190 },
    { title: "更新时间", dataIndex: "updateTime", width: 190 },
    { title: "操作", key: "actions", fixed: "right", width: 150, render: (_, bank) => <Space>
      <Button type="link" size="small" disabled={bank.id === undefined} onClick={() => openEditor(bank)}>编辑</Button>
      <Popconfirm title="确定删除该题库？" description="删除后无法恢复，请确认题库信息。" okText="删除" cancelText="取消" onConfirm={() => remove(bank.id)}>
        <Button type="link" size="small" danger loading={deletingId !== undefined && deletingId === bank.id} disabled={bank.id === undefined || deletingId !== undefined}>删除</Button>
      </Popconfirm>
    </Space> },
  ];

  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Typography.Title level={2} style={{ margin: 0 }}>题库管理</Typography.Title>
    <Card>
      <Form form={queryForm} layout="inline" style={{ rowGap: 16 }} onFinish={(values) => {
        setQuery({ title: values.title?.trim() || undefined });
        setPagination((value) => ({ ...value, current: 1 }));
      }}>
        <Form.Item label="标题" name="title"><Input allowClear placeholder="请输入题库标题" /></Form.Item>
        <Form.Item><Space>
          <Button type="primary" htmlType="submit">查询</Button>
          <Button onClick={() => { queryForm.resetFields(); setQuery({}); setPagination((value) => ({ ...value, current: 1 })); }}>重置</Button>
        </Space></Form.Item>
      </Form>
    </Card>
    <Card title="题库列表" extra={<Space>
      <Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRefreshKey((value) => value + 1)}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>新增题库</Button>
    </Space>}>
      <Table<API.QuestionBank> rowKey={(bank) => String(bank.id)} columns={columns} dataSource={records} loading={loading} scroll={{ x: 1600 }} pagination={{ ...pagination, total, showSizeChanger: true, showTotal: (count) => `共 ${count} 个题库`, onChange: (current, pageSize) => setPagination({ current, pageSize }) }} />
    </Card>
    <Modal title={editing ? "编辑题库" : "新增题库"} open={open} forceRender confirmLoading={saving} maskClosable={!saving && !coverBusy} closable={!saving && !coverBusy} cancelButtonProps={{ disabled: saving || coverBusy }} okButtonProps={{ disabled: coverBusy }} okText="保存" cancelText="取消" onCancel={() => { if (!saving && !coverBusyRef.current) setOpen(false); }} onOk={() => editForm.submit()}>
      <Form form={editForm} layout="vertical" onFinish={save} disabled={saving}>
        <Form.Item label="标题" name="title" rules={[{ required: true, whitespace: true, message: "请输入题库标题" }]}><Input maxLength={80} showCount /></Form.Item>
        <Form.Item label="描述" name="description"><Input.TextArea rows={4} /></Form.Item>
        <Form.Item label="题库封面" name="picture" rules={[{ validator: (_, value: string | undefined) => !value || isBankCoverUrl(value) ? Promise.resolve() : Promise.reject(new Error("请输入 HTTP(S) 图片地址或 / 开头的本地路径")) }]}>
          <BankCoverInput disabled={saving} onBusyChange={(busy) => { coverBusyRef.current = busy; setCoverBusy(busy); }} />
        </Form.Item>
      </Form>
    </Modal>
  </Space>;
}
