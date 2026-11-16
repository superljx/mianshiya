import Link from "next/link";
import { Alert, Card, Empty, Tag } from "antd";
import MdViewer from "@/components/MdViewer";
import { questionTags } from "@/components/QuestionList";
import { serverRequest } from "@/lib/serverRequest";
import type { QuestionBankContent, QuestionContent } from "@/types/content";
import styles from "./page.module.css";

export default async function BankQuestionPage({ params }: { params: { id: string; questionId: string } }) {
  let bank: QuestionBankContent | undefined;
  let question: QuestionContent | undefined;
  let error = "";
  if (![params.id, params.questionId].every((id) => /^\d+$/.test(id) && !/^0+$/.test(id))) {
    error = "题库或题目编号无效";
  } else {
    try {
      bank = await serverRequest<QuestionBankContent>("/questionBank/get/vo", { id: params.id, needQueryQuestionList: true });
      if (!bank) {
        error = "题库不存在或已被删除";
      } else if (!bank.questionPage?.records?.some((item) => item.id != null && String(item.id) === params.questionId)) {
        error = "当前题目不在已加载的题库列表中，无法确认题库归属。接口仅返回第一页，请从左侧已加载题目中选择。";
      } else {
        question = await serverRequest<QuestionContent>(`/question/get/vo?id=${encodeURIComponent(params.questionId)}`);
        if (!question || String(question.id) !== params.questionId) error = "题目不存在或接口返回的题目编号不一致";
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "题目加载失败，请稍后重试";
    }
  }
  const questions = bank?.questionPage?.records ?? [];
  return (
    <main className="page-container">
      <Link href={`/bank/${encodeURIComponent(params.id)}`}>返回题库详情</Link>
      <h1 className="page-title" style={{ marginTop: 24 }}>{bank?.title || "题库刷题"}</h1>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="题库题目导航">
          <h2 className={styles.heading}>题目列表</h2>
          {questions.length ? <ul className={styles.list}>
            {questions.map((item, index) => <li key={item.id ?? index}>
              {item.id != null ? <Link
                href={`/bank/${encodeURIComponent(params.id)}/question/${encodeURIComponent(item.id)}`}
                className={String(item.id) === params.questionId ? styles.active : styles.link}
                aria-current={String(item.id) === params.questionId ? "page" : undefined}
              >{index + 1}. {item.title || "未命名题目"}</Link> : <span className={styles.link}>{item.title || "未命名题目"}</span>}
            </li>)}
          </ul> : <Empty description="暂无可加载题目" />}
          <p className={styles.note}>共 {Number(bank?.questionPage?.total) || 0} 题，当前仅显示接口返回的第一页，暂不支持翻页。</p>
        </aside>
        <section className={styles.content} aria-label="当前题目">
          {error ? <Alert type="error" showIcon message="无法加载题目" description={error} /> : question && <>
            <h2 className={styles.questionTitle}>{question.title || "未命名题目"}</h2>
            <div className={styles.tags}>{questionTags(question).map((tag, index) => <Tag key={`${tag}-${index}`}>{tag}</Tag>)}</div>
            {question.user?.userName && <p className={styles.note}>创建者：{question.user.userName}</p>}
            <Card title="题目内容" style={{ marginBottom: 24 }}>
              {question.content ? <MdViewer value={question.content} /> : <Empty description="接口未提供题目内容" />}
            </Card>
            <Card title="参考答案"><Alert type="info" showIcon message="答案暂未由接口提供" description="当前公开题目详情接口不包含答案字段。" /></Card>
          </>}
        </section>
      </div>
    </main>
  );
}
