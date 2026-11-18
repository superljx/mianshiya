"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, ConfigProvider, Select, Spin, theme } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { apiRequest } from "@/lib/request";
import styles from "./index.module.css";

const LEVELS = [
  { label: "0 次", color: "#363B43", value: 0 },
  { label: "1–2 次", color: "#C6EBC1", min: 1, max: 2 },
  { label: "3–5 次", color: "#83D591", min: 3, max: 5 },
  { label: "6–10 次", color: "#35AA6B", min: 6, max: 10 },
  { label: "11+ 次", color: "#176C46", min: 11 },
];
const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function CalendarChart({ userId }: { userId: string }) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const today = localKey(now);
  const [year, setYear] = useState(thisYear);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<Record<string, number>>({});
  const [chartError, setChartError] = useState("");
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setRecords({});
    void apiRequest<Record<string, number>>({ url: "/user/get/active", method: "POST", params: { year }, signal: controller.signal, skipAuthRedirect: true })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("活跃记录格式无效");
        const valid: Record<string, number> = {};
        Object.entries(data).forEach(([date, count]) => {
          const parsed = new Date(`${date}T12:00:00`);
          if (date.startsWith(`${year}-`) && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsed.getTime()) && localKey(parsed) === date && Number.isInteger(count) && count > 0) valid[date] = count;
        });
        setRecords(valid);
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "活跃记录加载失败"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [year, reload, userId]);

  useEffect(() => {
    if (loading || error || !container.current) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setChartError("");
    void Promise.all([
      import("echarts/core"), import("echarts/charts"), import("echarts/components"), import("echarts/renderers"),
    ]).then(([echarts, charts, components, renderers]) => {
      if (disposed || !container.current) return;
      echarts.use([charts.HeatmapChart, components.CalendarComponent, components.TooltipComponent, components.VisualMapComponent, components.GraphicComponent, components.AriaComponent, renderers.CanvasRenderer]);
      const element = container.current;
      const chart = echarts.init(element);
      const monthlyData = Array.from({ length: 12 }, (_, month) => {
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, day) => {
          const date = localKey(new Date(year, month, day + 1));
          return { value: [date, records[date] ?? 0], itemStyle: { ...(date > today && !records[date] ? { color: "#292D34" } : {}), ...(date === today ? { borderColor: "#F0F6FC", borderWidth: 2 } : {}) } };
        });
      });
      let lastWidth = 0;
      const render = () => {
        const width = Math.round(element.clientWidth);
        if (!width || width === lastWidth) return;
        lastWidth = width;
        const columns = width >= 1100 ? 6 : width >= 650 ? 3 : width >= 340 ? 2 : 1;
        const gap = columns === 6 ? 20 : 24;
        const slot = (width - gap * (columns - 1)) / columns;
        const cell = Math.min(23, Math.floor((slot - 8) / 7));
        const gridWidth = cell * 7;
        const rowHeight = cell * 6 + 86;
        const height = Math.ceil(12 / columns) * rowHeight;
        element.style.height = `${height}px`;
        chart.resize({ width, height });
        chart.setOption({
          animation: false,
          tooltip: {
            triggerOn: "mousemove|click", confine: true, renderMode: "richText", backgroundColor: "#14181F", borderColor: "#505A68", borderWidth: 1, padding: [12, 16], textStyle: { color: "#F0F3F8", fontSize: 13 },
            formatter: (params: unknown) => {
              const value = (params as { value?: [string, number] }).value;
              if (!value) return "";
              const date = new Date(`${value[0]}T12:00:00`);
              const weekday = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
              return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · 周${weekday}\n${value[0] > today ? "未来日期 · " : ""}活跃次数：${value[1]} 次`;
            },
          },
          visualMap: { show: false, type: "piecewise", seriesIndex: Array.from({ length: 12 }, (_, index) => index), pieces: LEVELS.map(({ label, ...piece }) => piece) },
          graphic: Array.from({ length: 12 }, (_, index) => ({ type: "text", left: index % columns * (slot + gap) + (slot - gridWidth) / 2, top: Math.floor(index / columns) * rowHeight + 4, style: { text: `${index + 1} 月`, fill: "#E8EDF4", font: "500 15px sans-serif" } })),
          calendar: Array.from({ length: 12 }, (_, index) => ({
            range: `${year}-${String(index + 1).padStart(2, "0")}`, orient: "vertical", left: index % columns * (slot + gap) + (slot - gridWidth) / 2, top: Math.floor(index / columns) * rowHeight + 52, cellSize: [cell, cell],
            splitLine: { show: false }, itemStyle: { color: "transparent", borderWidth: 0 }, yearLabel: { show: false }, monthLabel: { show: false },
            dayLabel: { firstDay: 1, nameMap: ["日", "一", "二", "三", "四", "五", "六"], position: "start", margin: 12, color: "#A9B4C2", fontSize: 11 },
          })),
          series: monthlyData.map((data, index) => ({
            type: "heatmap", coordinateSystem: "calendar", calendarIndex: index, data,
            itemStyle: { borderColor: "#202228", borderWidth: 3 },
            emphasis: { itemStyle: { borderColor: "#B6F2D1", borderWidth: 2 } },
          })),
          aria: { enabled: true, description: `${year}年刷题活跃日历，共${Object.keys(records).length}个活跃日。每格一天，绿色越深次数越多，浅色边框标记今天。` },
        }, { notMerge: true });
      };
      render();
      const observer = new ResizeObserver(render);
      observer.observe(element);
      chart.getZr().on("click", (event) => { if (!event.target) chart.dispatchAction({ type: "hideTip" }); });
      cleanup = () => { observer.disconnect(); chart.dispose(); };
    }).catch(() => { if (!disposed) setChartError("图表加载失败，请点击刷新记录重试。"); });
    return () => { disposed = true; cleanup?.(); };
  }, [year, records, loading, error, today]);

  const values = Object.values(records);
  const total = values.reduce((sum, value) => sum + value, 0);
  const monthTotals = Array.from({ length: 12 }, (_, month) => Object.entries(records).reduce((sum, [date, count]) => Number(date.slice(5, 7)) === month + 1 ? sum + count : sum, 0));
  const bestMonth = total ? monthTotals.indexOf(Math.max(...monthTotals)) + 1 : null;

  return <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: "#83D591", colorBgContainer: "#292D34", colorBorder: "#505A68", colorText: "#F0F3F8", colorTextSecondary: "#A9B4C2", borderRadius: 8 } }}>
    <section className={styles.panel} aria-label="年度刷题活跃记录">
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>{year} · 学习足迹</div><h2 className={styles.title}>年度刷题活跃</h2><p className={styles.subtitle}>每个方格代表一天，颜色表示题目详情访问次数</p></div>
        <div className={styles.actions}>
          <Select aria-label="选择记录年份" value={year} onChange={setYear} options={Array.from({ length: 10 }, (_, index) => ({ value: thisYear - index, label: `${thisYear - index} 年` }))} />
          <Button icon={<ReloadOutlined />} onClick={() => setReload((value) => value + 1)} loading={loading}>刷新记录</Button>
        </div>
      </header>
      {error ? <div className={styles.state}><Alert type="error" showIcon message="记录加载失败" description={error} action={<Button onClick={() => setReload((value) => value + 1)}>重试</Button>} /></div> : loading ? <div className={styles.loading}><Spin tip="正在加载活跃记录"><div style={{ padding: 32 }} /></Spin></div> : <>
        <div className={styles.overview}>
          <div className={styles.stats}><div><span className={styles.statLabel}>活跃天数</span><strong>{values.length}<small>天</small></strong></div><div><span className={styles.statLabel}>累计活跃次数</span><strong className={styles.accent}>{total.toLocaleString()}<small>次</small></strong></div></div>
          <div className={styles.legend} aria-label="活跃次数图例">{LEVELS.map((level) => <span key={level.label}><i style={{ background: level.color }} />{level.label}</span>)}<span><i style={{ background: "#292D34" }} />未来</span></div>
        </div>
        {chartError && <Alert type="error" message={chartError} />}
        <div className={styles.scroll} tabIndex={0} role="img" aria-label={`${year}年活跃日历，共${values.length}个活跃日，累计${total}次；悬浮或轻点日期查看详情`}><div ref={container} className={styles.chart} /></div>
        {!values.length && <p className={styles.empty}>该年份暂无活跃记录，登录后浏览题目即可记录。</p>}
        <footer className={styles.footer}><span>{bestMonth ? `最佳月份：${bestMonth} 月（按累计活跃次数）` : "每一次学习，都值得记录"}</span><span>浅色描边为今天 · 悬浮或轻点查看次数</span></footer>
        <p className={styles.note}>活跃次数记录题目详情访问活动，不代表完成或掌握的题目数量。</p>
      </>}
    </section>
  </ConfigProvider>;
}
