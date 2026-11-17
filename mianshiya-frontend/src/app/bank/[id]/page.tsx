import Link from "next/link";
import BankCover from "@/components/BankCover";
import { Alert, Card } from "antd";
import { serverRequest } from "@/lib/serverRequest";
import QuestionList from "@/components/QuestionList";
import { ContentPagination, readSearch } from "@/components/QuestionList/ContentNavigation";
import type { QuestionBankContent } from "@/types/content";

export default async function BankPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const { current } = readSearch(searchParams);
  const pageSize = 10;
  let bank: QuestionBankContent | undefined;
  let error = "";
  if (!/^\d+$/.test(params.id) || /^0+$/.test(params.id)) {
    error = "题库编号无效";
  } else {
    try {
      bank = await serverRequest<QuestionBankContent>("/questionBank/get/vo", { id: params.id, needQueryQuestionList: true, current, pageSize });
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
        <header className="bank-detail-header">
          <BankCover src={bank.picture} title={bank.title} size="detail" />
          <div className="bank-card-text">
            <h1 className="page-title">{bank.title || "未命名题库"}</h1>
            <p className="page-description bank-detail-description">{bank.description?.trim() || "暂无题库介绍"}</p>
            {bank.user?.userName && <p className="page-description">创建者：{bank.user.userName}</p>}
          </div>
        </header>
        <Card title="题库题目">
          <p style={{ color: "#8c8c8c" }}>共 {Number(bank.questionPage?.total) || 0} 道题目</p>
          {firstQuestion?.id != null && <p><Link href={`/bank/${encodeURIComponent(params.id)}/question/${encodeURIComponent(firstQuestion.id)}?current=${current}`}>开始刷题</Link></p>}
          <QuestionList questions={bank.questionPage?.records ?? []} bankId={params.id} current={current} />
          <ContentPagination path={`/bank/${params.id}`} title="" current={current} total={bank.questionPage?.total} pageSize={pageSize} />
        </Card>
      </>}
    </main>
  );
}
