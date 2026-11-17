"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./index.module.css";

export interface BankCoverProps {
  src?: string;
  title?: string;
  size?: "card" | "detail";
}

export default function BankCover({ src, title = "题库", size = "card" }: BankCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const url = src?.trim() || "";
  const valid = /^(https?:\/\/|\/(?!\/))/.test(url);
  const showImage = valid && failedSrc !== url;
  return (
    <span className={`${styles.cover} ${size === "detail" ? styles.detail : ""}`}>
      {showImage ? <Image src={url} alt={`${title}封面`} fill unoptimized sizes={size === "detail" ? "112px" : "72px"}
        className={styles.image} onError={() => setFailedSrc(url)} />
        : <span className={styles.fallback} role="img" aria-label={`${title}默认封面`}>{Array.from(title.trim() || "题")[0]}</span>}
    </span>
  );
}
