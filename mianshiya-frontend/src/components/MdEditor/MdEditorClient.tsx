"use client";

import { Editor } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import "bytemd/dist/index.css";
import "highlight.js/styles/vs.css";
import styles from "./index.module.css";

const plugins = [gfm(), highlight()];

export interface MdEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function MdEditor({
  value = "",
  onChange,
  placeholder,
}: MdEditorProps) {
  return (
    <div className={styles.editor}>
      <Editor
        value={value}
        mode="split"
        plugins={plugins}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
}
