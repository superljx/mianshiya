import Link from "next/link";
import { Alert, Card, Empty } from "antd";
import { serverRequest } from "@/lib/serverRequest";
import { ContentPagination, ContentSearch, readSearch } from "@/components/QuestionList/ContentNavigation";
import type { ContentPage, ContentSearchParams, QuestionBankContent } from "@/types/content";

export default async function BanksPage({ searchParams }: { searchParams: ContentSearchParams }) {
  const { current, title } = readSearch(searchParams);
  const pageSize = 12;
  let page: ContentPage<QuestionBankContent> | undefined;
  let error = "";
  try {
    page = await serverRequest<ContentPage<QuestionBankContent>>("/questionBank/list/page/vo", { current, pageSize, title });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "题库加载失败，请稍后重试";
  }
  return (
    <main id="banksPage" className="page-container">
      <h1 className="page-title">题库</h1>
      <p className="page-description">按方向挑选题库，开始系统练习。</p>
      <ContentSearch path="/banks" title={title} placeholder="搜索题库名称" />
      {error ? <Alert type="error" showIcon message="题库加载失败" description={error} /> : <>
        {page?.records?.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
          {page.records.map((bank, index) => <Card key={bank.id ?? index}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>{bank.id != null ? <Link href={`/bank/${encodeURIComponent(bank.id)}`}>{bank.title || "未命名题库"}</Link> : bank.title || "未命名题库"}</h2>
            {bank.user?.userName && <p style={{ color: "#8c8c8c", marginBottom: 0 }}>创建者：{bank.user.userName}</p>}
          </Card>)}
        </div> : <Empty description={title ? "没有找到匹配的题库" : "暂无题库"} />}
        <ContentPagination path="/banks" title={title} current={current} total={page?.total} pageSize={pageSize} />
      </>}
    </main>
  );
}
