import Link from "next/link";
import { Alert, Card, Empty, Tag } from "antd";
import { serverRequest } from "@/lib/serverRequest";
import MdViewer from "@/components/MdViewer";
import { questionTags } from "@/components/QuestionList";
import type { QuestionContent } from "@/types/content";

export default async function QuestionPage({ params }: { params: { id: string } }) {
  let question: QuestionContent | undefined;
  let error = "";
  if (!/^\d+$/.test(params.id) || /^0+$/.test(params.id)) {
    error = "题目编号无效";
  } else {
    try {
      question = await serverRequest<QuestionContent>(`/question/get/vo?id=${encodeURIComponent(params.id)}`);
      if (!question) error = "题目不存在或已被删除";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "题目详情加载失败，请稍后重试";
    }
  }
  return (
    <main className="page-container">
      <Link href="/questions">返回题目列表</Link>
      {error ? <Alert style={{ marginTop: 24 }} type="error" showIcon message="无法加载题目" description={error} /> : question && <>
        <h1 className="page-title" style={{ marginTop: 24 }}>{question.title || "未命名题目"}</h1>
        <div style={{ marginBottom: 16 }}>{questionTags(question).map((tag, index) => <Tag key={`${tag}-${index}`}>{tag}</Tag>)}</div>
        {question.user?.userName && <p className="page-description">创建者：{question.user.userName}</p>}
        <Card title="题目内容" style={{ marginBottom: 24 }}>
          {question.content ? <MdViewer value={question.content} /> : <Empty description="接口未提供题目内容" />}
        </Card>
        <Card title="参考答案">
          <Alert type="info" showIcon message="答案暂未由接口提供" description="当前公开题目详情接口不包含答案字段。" />
        </Card>
      </>}
    </main>
  );
}
