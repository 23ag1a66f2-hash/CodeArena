import { useEffect, useRef } from "react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
  theme?: string;
  options?: any;
  disableCopyPaste?: boolean;
}

export default function MonacoEditor({
  value,
  onChange,
  language,
  height = "400px",
  theme = "vs-dark",
  options = {},
  disableCopyPaste = false,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const loadMonaco = async () => {
      // Load Monaco Editor from CDN
      if (!(window as any).monaco) {
        // Add Monaco loader script
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js";
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });

        // Configure Monaco
        (window as any).require.config({
          paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" },
        });

        await new Promise((resolve) => {
          (window as any).require(["vs/editor/editor.main"], resolve);
        });
      }

      if (containerRef.current && !(window as any).editorInstance) {
        // Create editor instance
        editorRef.current = (window as any).monaco.editor.create(containerRef.current, {
          value,
          language,
          theme,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastColumn: 5,
          readOnly: false,
          cursorStyle: "line",
          wordWrap: "on",
          ...options,
        });

        // Set up change listener
        editorRef.current.onDidChangeModelContent(() => {
          const currentValue = editorRef.current.getValue();
          onChange(currentValue);
        });

        // Disable copy-paste if requested
        if (disableCopyPaste) {
          // Disable copy-paste shortcuts
          editorRef.current.addCommand((window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.KeyC, () => {
            // Do nothing - copy disabled
          });
          editorRef.current.addCommand((window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.KeyV, () => {
            // Do nothing - paste disabled
          });
          editorRef.current.addCommand((window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.KeyX, () => {
            // Do nothing - cut disabled
          });
          
          // Also disable right-click context menu
          editorRef.current.onContextMenu(() => {
            // Do nothing - context menu disabled
          });
        }

        (window as any).editorInstance = editorRef.current;
      }
    };

    loadMonaco();

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        (window as any).editorInstance = null;
      }
    };
  }, [disableCopyPaste, options]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      (window as any).monaco.editor.setModelLanguage(editorRef.current.getModel(), language);
    }
  }, [language]);

  return <div ref={containerRef} style={{ height }} className="border rounded-lg" />;
}
