import Link from "next/link";
import type { ContentSearchParams } from "@/types/content";

export function readSearch(params: ContentSearchParams) {
  const rawCurrent = Array.isArray(params.current) ? params.current[0] : params.current;
  const parsed = Number(rawCurrent);
  const current = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
  const queryTitle = params.q ?? params.title;
  const rawTitle = Array.isArray(queryTitle) ? queryTitle[0] : queryTitle;
  return { current, title: rawTitle?.trim() || "" };
}

export function ContentSearch({ path, title, placeholder, preservedParams = {} }: { path: string; title: string; placeholder: string; preservedParams?: Record<string, string | string[]> }) {
  return (
    <form action={path} method="get" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
      {Object.entries(preservedParams).flatMap(([name, value]) => (Array.isArray(value) ? value : [value]).map((entry, index) => <input key={`${name}-${index}`} type="hidden" name={name} value={entry} />))}
      <input name="q" aria-label={placeholder} placeholder={placeholder} defaultValue={title} style={{ flex: "1 1 240px", padding: "10px 14px", border: "1px solid #d9d9d9", borderRadius: 6 }} />
      <button type="submit" style={{ padding: "10px 24px", background: "#1677ff", color: "white", border: 0, borderRadius: 6, cursor: "pointer" }}>搜索</button>
      {title && <Link href={path} style={{ alignSelf: "center" }}>清除搜索</Link>}
    </form>
  );
}

export function ContentPagination({ path, title, current, total, pageSize, preservedParams = {} }: { path: string; title: string; current: number; total: number | string | undefined; pageSize: number; preservedParams?: Record<string, string | string[]> }) {
  const count = Math.max(0, Number(total) || 0);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const href = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(preservedParams).forEach(([name, value]) => (Array.isArray(value) ? value : [value]).forEach((entry) => params.append(name, entry)));
    if (title) params.set("q", title);
    params.set("current", String(page));
    return `${path}?${params}`;
  };
  return (
    <nav aria-label="列表分页" style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", marginTop: 24 }}>
      <span>共 {count} 条 · 第 {current} / {pages} 页</span>
      {current > 1 && <Link href={href(current - 1)}>上一页</Link>}
      {current < pages && <Link href={href(current + 1)}>下一页</Link>}
    </nav>
  );
}
