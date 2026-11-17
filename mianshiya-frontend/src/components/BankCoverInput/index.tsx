"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Image, Input, Space, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { apiRequest } from "@/lib/request";

interface BankCoverInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}

export function isBankCoverUrl(value: string) {
  if (typeof value !== "string" || /[\s\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export default function BankCoverInput({ value, onChange, onBusyChange, disabled }: BankCoverInputProps) {
  const { message } = App.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string>();
  const controllerRef = useRef<AbortController>();
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      onBusyChangeRef.current?.(false);
    };
  }, []);

  function updateBusy(next: boolean) {
    busyRef.current = next;
    if (mountedRef.current) setBusy(next);
    onBusyChangeRef.current?.(next);
  }

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = undefined;
    setPreview(undefined);
    setPrepared(undefined);
  }

  async function selectFile(file: File) {
    if (busyRef.current || disabled) return;
    updateBusy(true);
    setError(undefined);
    let sourceUrl: string | undefined;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const format = extension === "jpg" ? "jpeg" : extension;
      if (!["jpeg", "png", "webp"].includes(format ?? "") || file.type !== `image/${format}`) {
        throw new Error("仅支持后缀与类型一致的 JPG、PNG、WebP 图片，不支持 SVG/GIF");
      }
      if (!file.size || file.size > 2 * 1024 * 1024) throw new Error("图片不能为空且不能超过 2MB");
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const signatureMatches = format === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : format === "png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
          : String.fromCharCode(...Array.from(bytes.slice(0, 4))) === "RIFF" && String.fromCharCode(...Array.from(bytes.slice(8, 12))) === "WEBP";
      if (!signatureMatches) throw new Error("图片实际格式与后缀不一致");
      sourceUrl = URL.createObjectURL(file);
      const image = new window.Image();
      image.src = sourceUrl;
      await image.decode();
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width < 128 || height < 128 || width > 4096 || height > 4096 || width * height > 16000000) {
        throw new Error("图片最小为 128×128，最大边为 4096，总像素不能超过 1600 万");
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器无法安全压缩图片，请更换浏览器");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 256, 256);
      const scale = Math.min(256 / width, 256 / height);
      context.drawImage(image, (256 - width * scale) / 2, (256 - height * scale) / 2, width * scale, height * scale);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob || blob.type !== "image/png" || !blob.size || blob.size > 2 * 1024 * 1024) {
        throw new Error("无法安全生成 2MB 以内的 PNG 封面，请更换图片或浏览器");
      }
      if (!mountedRef.current) return;
      clearPreview();
      const url = URL.createObjectURL(blob);
      previewRef.current = url;
      setPreview(url);
      setPrepared(new File([blob], "cover.png", { type: "image/png" }));
    } catch (cause: unknown) {
      if (mountedRef.current) setError(cause instanceof Error ? cause.message : "图片读取失败，请重新选择");
    } finally {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      updateBusy(false);
    }
  }

  async function upload() {
    if (!prepared || busyRef.current || disabled) return;
    updateBusy(true);
    setError(undefined);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const data = new FormData();
      data.append("file", prepared);
      data.append("biz", "question_bank_cover");
      const url = await apiRequest<string>({ url: "/file/upload", method: "POST", data, signal: controller.signal });
      if (!isBankCoverUrl(url)) throw new Error("上传接口返回了无效的图片地址");
      if (mountedRef.current) {
        onChange?.(url);
        clearPreview();
        void message.success("封面已上传，保存题库后生效");
      }
    } catch (cause: unknown) {
      if (mountedRef.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "上传失败，原封面已保留");
    } finally {
      updateBusy(false);
    }
  }

  const currentPreview = preview ?? (value && isBankCoverUrl(value) ? value : undefined);
  return <Space direction="vertical" style={{ width: "100%" }}>
    <Input value={value ?? ""} onChange={(event) => { clearPreview(); onChange?.(event.target.value); }} disabled={disabled || busy} allowClear placeholder="HTTP(S) 图片地址或 / 开头的本地路径" />
    <Space wrap>
      <Button icon={<UploadOutlined />} disabled={disabled || busy} onClick={() => inputRef.current?.click()}>选择本地图片</Button>
      {prepared && <><Button type="primary" loading={busy} disabled={disabled} onClick={() => void upload()}>确认上传</Button><Button disabled={disabled || busy} onClick={clearPreview}>取消选择</Button></>}
      {busy && !prepared && <Typography.Text type="secondary">正在校验并压缩图片…</Typography.Text>}
    </Space>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void selectFile(file);
    }} />
    {currentPreview && <Image src={currentPreview} alt="题库封面预览" width={128} height={128} style={{ objectFit: "contain", background: "#fff", border: "1px solid #eee", borderRadius: 8 }} />}
    <Typography.Text type="secondary">推荐 256×256；JPG/PNG/WebP ≤2MB，最小 128×128，最大边 4096，总像素 ≤1600 万。上传前将等比缩放、白色补边并转换为 256×256 PNG（含 WebP 输入）。</Typography.Text>
    {prepared && <Alert type="info" showIcon message="当前为待上传预览，请先确认上传；未上传时保存将保留原封面。" />}
    {error && <Alert type="error" showIcon message={error} />}
  </Space>;
}
