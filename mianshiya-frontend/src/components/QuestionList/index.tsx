import Link from "next/link";
import { Empty, Tag } from "antd";
import type { ContentId, QuestionContent } from "@/types/content";

export function questionTags(question: QuestionContent): string[] {
  if (Array.isArray(question.tagList)) return question.tagList;
  if (!question.tags) return [];
  try {
    const tags: unknown = JSON.parse(question.tags);
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export default function QuestionList({ questions, bankId, current = 1 }: { questions: QuestionContent[]; bankId?: ContentId; current?: number }) {
  if (!questions.length) return <Empty description="暂无题目" />;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {questions.map((question, index) => (
        <li key={question.id ?? index} style={{ padding: "20px 0", borderBottom: "1px solid #f0f0f0" }}>
          <h3 style={{ margin: "0 0 10px" }}>
            {question.id != null ? <Link href={bankId != null ? `/bank/${encodeURIComponent(bankId)}/question/${encodeURIComponent(question.id)}?current=${current}` : `/question/${encodeURIComponent(question.id)}`}>{question.title || "未命名题目"}</Link> : question.title || "未命名题目"}
          </h3>
          <div>{questionTags(question).map((tag, tagIndex) => <Tag key={`${tag}-${tagIndex}`}>{tag}</Tag>)}</div>
          {question.user?.userName && <p style={{ color: "#8c8c8c", marginBottom: 0 }}>创建者：{question.user.userName}</p>}
        </li>
      ))}
    </ul>
  );
}
