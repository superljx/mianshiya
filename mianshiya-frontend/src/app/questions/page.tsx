import { Alert } from "antd";
import { serverRequest } from "@/lib/serverRequest";
import QuestionList from "@/components/QuestionList";
import { ContentPagination, ContentSearch, readSearch } from "@/components/QuestionList/ContentNavigation";
import { QUESTION_SEARCH_PATH, type ContentPage, type ContentSearchParams, type QuestionContent, type QuestionSearchRequest } from "@/types/content";

export default async function QuestionsPage({ searchParams }: { searchParams: ContentSearchParams }) {
  const { current } = readSearch(searchParams);
  const first = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || "";
  };
  // 兼容旧链接 q/title，新关键词统一映射 searchText（标题、内容、答案）。
  const title = first("q") || first("searchText") || first("title");
  const requestedSize = Number(first("pageSize"));
  const pageSize = Number.isInteger(requestedSize) && requestedSize > 0 && requestedSize <= 200 ? requestedSize : 20;
  const data: QuestionSearchRequest = { current, pageSize, ...(title ? { searchText: title } : {}) };
  const preservedParams: Record<string, string | string[]> = { pageSize: String(pageSize) };
  for (const key of ["id", "notId", "userId", "questionBankId"] as const) {
    const value = first(key);
    if (/^[1-9]\d*$/.test(value)) { data[key] = value; preservedParams[key] = value; }
  }
  const content = first("content");
  if (content) { data.content = content; preservedParams.content = content; }
  const tags = Array.from(new Set((Array.isArray(searchParams.tags) ? searchParams.tags : [searchParams.tags ?? ""]).map((tag) => tag.trim()).filter(Boolean)));
  if (tags.length) { data.tags = tags; preservedParams.tags = tags; }
  const sortField = first("sortField");
  if (["id", "createTime", "updateTime", "userId"].includes(sortField)) {
    data.sortField = sortField;
    data.sortOrder = first("sortOrder") === "ascend" ? "ascend" : "descend";
    preservedParams.sortField = sortField;
    preservedParams.sortOrder = data.sortOrder;
  }
  let page: ContentPage<QuestionContent> | undefined;
  let error = "";
  try {
    page = await serverRequest<ContentPage<QuestionContent>>(QUESTION_SEARCH_PATH, data);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "题目加载失败，请稍后重试";
  }
  return (
    <main id="questionsPage" className="page-container">
      <h1 className="page-title">题目</h1>
      <p className="page-description">搜索面试题，查看题目内容与知识标签。</p>
      <ContentSearch path="/questions" title={title} placeholder="搜索题目标题、内容或答案" preservedParams={preservedParams} />
      {error ? <Alert type="error" showIcon message="题目加载失败" description={error} /> : <>
        <QuestionList questions={page?.records ?? []} />
        <ContentPagination path="/questions" title={title} current={current} total={page?.total} pageSize={pageSize} preservedParams={preservedParams} />
      </>}
    </main>
  );
}
