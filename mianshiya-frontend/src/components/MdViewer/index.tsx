"use client";

import dynamic from "next/dynamic";

export type { MdViewerProps } from "./MdViewerClient";

const MdViewer = dynamic(() => import("./MdViewerClient"), {
  ssr: false,
});

export default MdViewer;
