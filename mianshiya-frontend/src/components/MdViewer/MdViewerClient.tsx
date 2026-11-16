"use client";

import { Viewer } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import "bytemd/dist/index.css";
import "highlight.js/styles/vs.css";

const plugins = [gfm(), highlight()];

export interface MdViewerProps {
  value?: string;
}

export default function MdViewer({ value = "" }: MdViewerProps) {
  return <Viewer value={value} plugins={plugins} />;
}
