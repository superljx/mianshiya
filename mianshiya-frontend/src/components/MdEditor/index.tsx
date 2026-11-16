"use client";

import dynamic from "next/dynamic";

export type { MdEditorProps } from "./MdEditorClient";

const MdEditor = dynamic(() => import("./MdEditorClient"), {
  ssr: false,
});

export default MdEditor;
