import Link from "next/link";
import { Alert, Card } from "antd";
import { serverRequest } from "@/lib/serverRequest";
import QuestionList from "@/components/QuestionList";
import type { QuestionBankContent } from "@/types/content";

export default async function BankPage({ params }: { params: { id: string } }) {
  let bank: QuestionBankContent | undefined;
  let error = "";
  if (!/^\d+$/.test(params.id) || /^0+$/.test(params.id)) {
    error = "题库编号无效";
  } else {
    try {
      bank = await serverRequest<QuestionBankContent>("/questionBank/get/vo", { id: params.id, needQueryQuestionList: true });
      if (!bank) error = "题库不存在或已被删除";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "题库详情加载失败，请稍后重试";
    }
  }
  const firstQuestion = bank?.questionPage?.records?.find((question) => question.id != null);
  return (
    <main className="page-container">
      <Link href="/banks">返回题库列表</Link>
      {error ? <Alert style={{ marginTop: 24 }} type="error" showIcon message="无法加载题库" description={error} /> : bank && <>
        <h1 className="page-title" style={{ marginTop: 24 }}>{bank.title || "未命名题库"}</h1>
        {bank.user?.userName && <p className="page-description">创建者：{bank.user.userName}</p>}
        <Card title="题库题目">
          <p style={{ color: "#8c8c8c" }}>共 {Number(bank.questionPage?.total) || 0} 道题目</p>
          {firstQuestion?.id != null && <p><Link href={`/bank/${encodeURIComponent(params.id)}/question/${encodeURIComponent(firstQuestion.id)}`}>开始刷题</Link></p>}
          <QuestionList questions={bank.questionPage?.records ?? []} bankId={params.id} />
          <Alert style={{ marginTop: 20 }} type="info" showIcon message="当前接口仅提供题库内题目的第一页，暂不支持翻页。" />
        </Card>
      </>}
    </main>
  );
}
