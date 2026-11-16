import { Alert } from "antd";
import { serverRequest } from "@/lib/serverRequest";
import QuestionList from "@/components/QuestionList";
import { ContentPagination, ContentSearch, readSearch } from "@/components/QuestionList/ContentNavigation";
import type { ContentPage, ContentSearchParams, QuestionContent } from "@/types/content";

export default async function QuestionsPage({ searchParams }: { searchParams: ContentSearchParams }) {
  const { current, title } = readSearch(searchParams);
  const pageSize = 20;
  let page: ContentPage<QuestionContent> | undefined;
  let error = "";
  try {
    page = await serverRequest<ContentPage<QuestionContent>>("/question/list/page/vo", { current, pageSize, title });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "题目加载失败，请稍后重试";
  }
  return (
    <main id="questionsPage" className="page-container">
      <h1 className="page-title">题目</h1>
      <p className="page-description">搜索面试题，查看题目内容与知识标签。</p>
      <ContentSearch path="/questions" title={title} placeholder="搜索题目标题" />
      {error ? <Alert type="error" showIcon message="题目加载失败" description={error} /> : <>
        <QuestionList questions={page?.records ?? []} />
        <ContentPagination path="/questions" title={title} current={current} total={page?.total} pageSize={pageSize} />
      </>}
    </main>
  );
}
