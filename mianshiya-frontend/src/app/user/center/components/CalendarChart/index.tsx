"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Select, Space, Spin, Statistic, Typography } from "antd";
import { apiRequest } from "@/lib/request";
import styles from "./index.module.css";

export default function CalendarChart({ userId }: { userId: string }) {
  const thisYear = new Date().getFullYear();
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
          if (date.startsWith(`${year}-`) && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(count) && count > 0) valid[date] = count;
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
      echarts.use([charts.HeatmapChart, components.CalendarComponent, components.TooltipComponent, components.VisualMapComponent, renderers.CanvasRenderer]);
      const chart = echarts.init(container.current);
      const data: [string, number][] = [];
      // 本地日期生成，避免 UTC 转换导致跨时区偏移；自动覆盖闰年。
      for (const date = new Date(year, 0, 1); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
        const key = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        data.push([key, records[key] ?? 0]);
      }
      chart.setOption({
        animation: false,
        tooltip: { renderMode: "richText", formatter: (params: unknown) => {
          const value = (params as { value?: [string, number] }).value;
          return value ? `${value[0]}\n活跃次数：${value[1]}` : "";
        } },
        visualMap: { type: "piecewise", orient: "horizontal", left: "center", bottom: 8, itemWidth: 12, itemHeight: 12, textStyle: { color: "#596579" }, pieces: [
          { value: 0, label: "0 次", color: "#edf1f5" },
          { min: 1, max: 2, label: "1–2 次", color: "#bbdfcc" },
          { min: 3, max: 5, label: "3–5 次", color: "#70bb98" },
          { min: 6, max: 10, label: "6–10 次", color: "#329471" },
          { min: 11, label: "11+ 次", color: "#17664e" },
        ] },
        calendar: { top: 36, left: 40, right: 20, range: String(year), cellSize: ["auto", 19], splitLine: { lineStyle: { color: "#d5dce5", width: 1 } }, itemStyle: { borderColor: "#fff", borderWidth: 2 }, yearLabel: { show: false }, dayLabel: { firstDay: 1, nameMap: "ZH", color: "#596579" }, monthLabel: { nameMap: "ZH", color: "#596579" } },
        series: [{ type: "heatmap", coordinateSystem: "calendar", data, emphasis: { itemStyle: { borderColor: "#1677ff", borderWidth: 1 } } }],
        aria: { enabled: true, description: `${year}年刷题活跃日历，颜色越深表示当天活跃次数越多。` },
      });
      const resize = new ResizeObserver(() => chart.resize());
      resize.observe(container.current);
      cleanup = () => { resize.disconnect(); chart.dispose(); };
    }).catch(() => { if (!disposed) setChartError("图表加载失败，请刷新页面重试。"); });
    return () => { disposed = true; cleanup?.(); };
  }, [year, records, loading, error]);

  const values = Object.values(records);
  return <div>
    <Space wrap className={styles.toolbar}>
      <Typography.Text strong>年度刷题活跃记录</Typography.Text>
      <Select aria-label="选择记录年份" value={year} onChange={setYear} options={Array.from({ length: 10 }, (_, index) => ({ value: thisYear - index, label: `${thisYear - index} 年` }))} />
      <Button onClick={() => setReload((value) => value + 1)} loading={loading}>刷新记录</Button>
    </Space>
    {error ? <Alert type="error" showIcon message="记录加载失败" description={error} action={<Button onClick={() => setReload((value) => value + 1)}>重试</Button>} /> : loading ? <div className={styles.loading}><Spin tip="正在加载活跃记录"><div style={{ padding: 32 }} /></Spin></div> : <>
      <Space size={40} wrap className={styles.stats}>
        <Statistic title="活跃天数" value={values.length} suffix="天" />
        <Statistic title="累计活跃次数" value={values.reduce((sum, value) => sum + value, 0)} suffix="次" />
      </Space>
      {chartError && <Alert type="error" message={chartError} />}
      <div className={styles.scroll} tabIndex={0} aria-label="年度活跃热力图，小屏可左右滚动"><div ref={container} className={styles.chart} /></div>
      {!values.length && <Typography.Paragraph type="secondary">该年份暂无活跃记录，登录后浏览题目即可记录。</Typography.Paragraph>}
      <Typography.Paragraph type="secondary">颜色越深，当天活跃次数越多。次数表示题目详情访问活动，不代表完成或掌握的题目数量。</Typography.Paragraph>
    </>}
  </div>;
}
