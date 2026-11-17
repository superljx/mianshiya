"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { apiRequest } from "@/lib/request";
import MdEditor from "@/components/MdEditor";

function parseTags(tags?: string): string[] {
  try {
    const value: unknown = JSON.parse(tags || "[]");
    return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

type QuestionQuery = Omit<API.QuestionQueryRequest, "questionBankId"> & { questionBankId?: string };

interface RelationForm {
  questionBankId: string;
  action: "add" | "remove";
}

export default function AdminQuestionPage() {
  const { message } = App.useApp();
  const [queryForm] = Form.useForm<QuestionQuery>();
  const [editForm] = Form.useForm<API.QuestionAddRequest>();
  const [relationForm] = Form.useForm<RelationForm>();
  const [query, setQuery] = useState<QuestionQuery>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [records, setRecords] = useState<API.Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<API.Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number>();
  const [relationQuestion, setRelationQuestion] = useState<API.Question | null>(null);
  const [relating, setRelating] = useState(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const relatingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void apiRequest<API.PageQuestion_>({
      url: "/question/list/page", method: "POST", data: { ...query, ...pagination }, signal: controller.signal,
    }).then((page) => {
      if (controller.signal.aborted) return;
      setRecords(page.records ?? []);
      setTotal(Number(page.total) || 0);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setRecords([]);
      setTotal(0);
      void message.error(error instanceof Error ? error.message : "加载题目失败");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, pagination, refreshKey, message]);

  function openEditor(question: API.Question | null) {
    setEditing(question);
    editForm.resetFields();
    editForm.setFieldsValue({ title: question?.title ?? "", content: question?.content ?? "", answer: question?.answer ?? "", tags: parseTags(question?.tags) });
    setOpen(true);
  }

  async function save(values: API.QuestionAddRequest) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (editing) {
        const data: API.QuestionUpdateRequest = { id: editing.id, title: values.title?.trim(), content: values.content, answer: values.answer, tags: Array.from(new Set((values.tags ?? []).map((tag) => tag.trim()).filter(Boolean))) };
        const updated = await apiRequest<boolean>({ url: "/question/update", method: "POST", data });
        if (!updated) throw new Error("题目未更新，请刷新后重试");
      } else {
        const data: API.QuestionAddRequest = { ...values, title: values.title?.trim(), tags: Array.from(new Set((values.tags ?? []).map((tag) => tag.trim()).filter(Boolean))) };
        await apiRequest<number>({ url: "/question/add", method: "POST", data });
      }
      void message.success(editing ? "题目已更新" : "题目已新增");
      setOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      void message.error(error instanceof Error ? error.message : "保存题目失败");
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
      const deleted = await apiRequest<boolean>({ url: "/question/delete", method: "POST", data: { id } satisfies API.DeleteRequest });
      if (!deleted) throw new Error("题目未删除，请刷新后重试");
      void message.success("题目已删除");
      if (records.length === 1 && pagination.current > 1) setPagination((value) => ({ ...value, current: value.current - 1 }));
      else setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      void message.error(error instanceof Error ? error.message : "删除题目失败");
    } finally {
      deletingRef.current = false;
      setDeletingId(undefined);
    }
  }

  async function saveRelation(values: RelationForm) {
    if (!relationQuestion || relatingRef.current) return;
    relatingRef.current = true;
    setRelating(true);
    try {
      const data: Omit<API.QuestionBankQuestionAddRequest, "questionBankId"> & { questionBankId: string } = { questionBankId: values.questionBankId, questionId: relationQuestion.id };
      if (values.action === "remove") {
        const removed = await apiRequest<boolean>({ url: "/questionBankquestion/remove", method: "POST", data });
        if (!removed) throw new Error("关联未移除，请确认题库 ID 和题目关联");
      } else {
        await apiRequest<number>({ url: "/questionBankquestion/add", method: "POST", data });
      }
      void message.success(values.action === "add" ? "题目已加入题库" : "题目已移出题库");
      setRelationQuestion(null);
      setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      void message.error(error instanceof Error ? error.message : "更新题库关联失败");
    } finally {
      relatingRef.current = false;
      setRelating(false);
    }
  }

  const columns: TableColumnsType<API.Question> = [
    { title: "ID", dataIndex: "id", width: 190 },
    { title: "标题", dataIndex: "title", width: 230, ellipsis: true },
    { title: "内容", dataIndex: "content", width: 240, ellipsis: true },
    { title: "答案", dataIndex: "answer", width: 240, ellipsis: true },
    { title: "标签", dataIndex: "tags", width: 200, render: (tags?: string) => <Space size={[0, 4]} wrap>{parseTags(tags).map((tag, index) => <Tag key={`${tag}-${index}`}>{tag}</Tag>)}</Space> },
    { title: "创建人 ID", dataIndex: "userId", width: 190 },
    { title: "创建时间", dataIndex: "createTime", width: 190 },
    { title: "更新时间", dataIndex: "updateTime", width: 190 },
    { title: "操作", key: "actions", fixed: "right", width: 230, render: (_, question) => <Space>
      <Button type="link" size="small" disabled={question.id === undefined} onClick={() => openEditor(question)}>编辑</Button>
      <Button type="link" size="small" disabled={question.id === undefined} onClick={() => { relationForm.resetFields(); setRelationQuestion(question); }}>题库关联</Button>
      <Popconfirm title="确定删除该题目？" description="删除后无法恢复，请确认题目信息。" okText="删除" cancelText="取消" onConfirm={() => remove(question.id)}>
        <Button type="link" size="small" danger loading={deletingId !== undefined && deletingId === question.id} disabled={question.id === undefined || deletingId !== undefined}>删除</Button>
      </Popconfirm>
    </Space> },
  ];

  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Typography.Title level={2} style={{ margin: 0 }}>题目管理</Typography.Title>
    <Card>
      <Form form={queryForm} layout="inline" style={{ rowGap: 16 }} onFinish={(values) => {
        setQuery({ title: values.title?.trim() || undefined, tags: values.tags?.length ? values.tags : undefined, questionBankId: values.questionBankId });
        setPagination((value) => ({ ...value, current: 1 }));
      }}>
        <Form.Item label="标题" name="title"><Input allowClear placeholder="请输入题目标题" /></Form.Item>
        <Form.Item label="标签" name="tags"><Select mode="tags" allowClear style={{ minWidth: 200 }} placeholder="输入标签后按回车" /></Form.Item>
        <Form.Item label="题库 ID" name="questionBankId" rules={[{ pattern: /^[1-9]\d*$/, message: "请输入正整数题库 ID" }]}><Input allowClear placeholder="按题库筛选" style={{ width: 190 }} /></Form.Item>
        <Form.Item><Space>
          <Button type="primary" htmlType="submit">查询</Button>
          <Button onClick={() => { queryForm.resetFields(); setQuery({}); setPagination((value) => ({ ...value, current: 1 })); }}>重置</Button>
        </Space></Form.Item>
      </Form>
    </Card>
    <Card title="题目列表" extra={<Space>
      <Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRefreshKey((value) => value + 1)}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>新增题目</Button>
    </Space>}>
      <Table<API.Question> rowKey={(question) => String(question.id)} columns={columns} dataSource={records} loading={loading} scroll={{ x: 1900 }} pagination={{ ...pagination, total, showSizeChanger: true, showTotal: (count) => `共 ${count} 道题目`, onChange: (current, pageSize) => setPagination({ current, pageSize }) }} />
    </Card>
    <Modal title={editing ? "编辑题目" : "新增题目"} open={open} width={1000} forceRender confirmLoading={saving} maskClosable={!saving} closable={!saving} cancelButtonProps={{ disabled: saving }} okText="保存" cancelText="取消" onCancel={() => { if (!saving) setOpen(false); }} onOk={() => editForm.submit()}>
      <Form form={editForm} layout="vertical" onFinish={save} disabled={saving}>
        <Form.Item label="标题" name="title" rules={[{ required: true, whitespace: true, message: "请输入题目标题" }]}><Input maxLength={80} showCount /></Form.Item>
        <Form.Item label="标签" name="tags"><Select mode="tags" disabled={saving} placeholder="输入标签后按回车" /></Form.Item>
        <Form.Item label="内容（Markdown）" name="content"><MdEditor /></Form.Item>
        <Form.Item label="答案（Markdown）" name="answer"><MdEditor /></Form.Item>
      </Form>
    </Modal>
    <Modal title="管理题库关联" open={Boolean(relationQuestion)} forceRender confirmLoading={relating} maskClosable={!relating} closable={!relating} cancelButtonProps={{ disabled: relating }} okText="确认" cancelText="取消" onCancel={() => { if (!relating) setRelationQuestion(null); }} onOk={() => relationForm.submit()}>
      <Typography.Paragraph>题目：{relationQuestion?.title}（ID：{relationQuestion?.id}）</Typography.Paragraph>
      <Form form={relationForm} layout="vertical" initialValues={{ action: "add" }} disabled={relating} onFinish={saveRelation}>
        <Form.Item label="题库 ID" name="questionBankId" rules={[{ required: true, message: "请输入题库 ID" }, { pattern: /^[1-9]\d*$/, message: "请输入正整数题库 ID" }]}><Input placeholder="请输入题库 ID" /></Form.Item>
        <Form.Item label="操作" name="action" rules={[{ required: true }]}><Select options={[{ value: "add", label: "加入题库" }, { value: "remove", label: "移出题库（不会删除题目）" }]} /></Form.Item>
      </Form>
    </Modal>
  </Space>;
}
