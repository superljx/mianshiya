"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Spin, Tooltip } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/request";
import styles from "./HomeMonthlyActivity.module.css";

const colors = ["#e9edf1", "#c6ebc1", "#83d591", "#35aa6b", "#176c46"];
const colorFor = (count: number) => colors[count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function HomeMonthlyActivity() {
  const { loginUser, status } = useAppSelector((state) => state.user);
  const [now, setNow] = useState(() => new Date());
  const [result, setResult] = useState<{ key: string; records: Record<string, number> }>();
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const year = now.getFullYear();
  const month = now.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const userId = status === "authenticated" ? loginUser?.id : undefined;
  const key = `${userId ?? "guest"}:${prefix}`;
  const records = result?.key === key ? result.records : {};
  const error = failure?.key === key ? failure.message : "";

  useEffect(() => {
    const refreshDate = () => setNow(new Date());
    const timer = window.setInterval(refreshDate, 60000);
    window.addEventListener("focus", refreshDate);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshDate); };
  }, []);

  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();
    setLoading(true);
    setFailure(undefined);
    // 后端按年返回；进入展示状态前严格过滤本月，统计和格子均不使用其他月份。
    void apiRequest<Record<string, number>>({ url: "/user/get/active", method: "POST", params: { year }, skipAuthRedirect: true, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("活跃记录格式无效");
        const filtered: Record<string, number> = {};
        const days = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= days; day++) {
          const date = `${prefix}${String(day).padStart(2, "0")}`;
          const count = data[date];
          if (Number.isInteger(count) && count > 0) filtered[date] = count;
        }
        setResult({ key, records: filtered });
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setFailure({ key, message: cause instanceof Error ? cause.message : "加载失败" }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, year, month, prefix, key, reload]);

  const days = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = Object.values(records).reduce((sum, count) => sum + count, 0);
  const today = dateKey(now);
  const pending = loading || (userId != null && result?.key !== key && !error);

  return <section className={styles.panel} aria-label="本月刷题活跃热力图">
    <header className={styles.header}><div><h2>本月学习足迹</h2><span>{year} 年 {month + 1} 月</span></div>{userId != null && <Button type="text" size="small" icon={<ReloadOutlined />} aria-label="刷新本月记录" loading={pending} onClick={() => { setNow(new Date()); setReload((value) => value + 1); }} />}</header>
    {status === "idle" || status === "loading" ? <div className={styles.state}><Spin size="small" /></div>
      : status === "anonymous" ? <div className={styles.state}><p>记录每一天的学习积累</p><Link href="/user/login?returnUrl=%2F">登录后查看本月足迹 →</Link></div>
      : status === "error" ? <div className={styles.state}>暂时无法确认登录状态，请刷新页面</div>
      : error ? <div className={styles.state}><p role="alert">本月记录加载失败</p><Button size="small" onClick={() => setReload((value) => value + 1)}>重试</Button></div>
      : pending ? <div className={styles.state}><Spin size="small" /></div> : <>
        <div className={styles.summary}><strong>{Object.keys(records).length}</strong> 个活跃日<span>累计 <b>{total.toLocaleString()}</b> 次</span></div>
        <div className={styles.calendar} aria-label={`${year}年${month + 1}月，${Object.keys(records).length}个活跃日，累计${total}次`}>
          {["一", "二", "三", "四", "五", "六", "日"].map((day) => <span className={styles.weekday} key={day}>{day}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
          {Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const date = `${prefix}${String(day).padStart(2, "0")}`;
            const count = records[date] ?? 0;
            const future = date > today;
            const label = `${year}年${month + 1}月${day}日 · ${future ? "未来日期 · " : ""}活跃 ${count} 次`;
            return <Tooltip title={label} trigger={["hover", "focus", "click"]} key={date}><button type="button" aria-label={label} aria-current={date === today ? "date" : undefined} className={`${styles.day} ${date === today ? styles.today : ""}`} style={{ background: future && !count ? "#f5f7f9" : colorFor(count), color: count >= 6 ? "#fff" : "#345048" }}>{day}</button></Tooltip>;
          })}
        </div>
        <footer className={styles.footer}><span className={styles.legend}>少{colors.map((color, index) => <i key={color} style={{ background: color }} title={["0 次", "1–2 次", "3–5 次", "6–10 次", "11+ 次"][index]} />)}多</span><Link href="/user/center">年度记录 →</Link></footer>
        <span className={styles.note}>次数为题目详情访问次数 · 描边为今天</span>
      </>}
  </section>;
}
