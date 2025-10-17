import { useEffect, useRef } from "react";
import type { Problem } from "@/types/problem";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  problem?: Problem;
}

export function CodeEditor({ value, onChange, language, problem }: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const previousLanguageRef = useRef(language);

  // Effect to handle language changes
  useEffect(() => {
    // Only update code if language has changed
    if (previousLanguageRef.current !== language) {
      const starterCode = problem?.starterCode?.[language] || getDefaultStarterCode(language);
      onChange(starterCode);
      previousLanguageRef.current = language;
    }
  }, [language, problem, onChange]);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    // Set initial value to starter code if no value is provided
    if (!value) {
      const starterCode = problem?.starterCode?.[language] || getDefaultStarterCode(language);
      onChange(starterCode);
    }
  };

  const getDefaultStarterCode = (lang: string) => {
    switch (lang) {
      case "python":
        return `def solution():\n    pass`;
      case "java":
        return `public class Solution {\n    public void solution() {\n    }\n}`;
      case "cpp":
        return `#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}`;
      case "c":
        return `#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}`;
      default:
        return "// Write your solution here";
    }
  };

  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
      case "python":
        return "python";
      case "java":
        return "java";
      case "cpp":
      case "c":
        return "cpp";
      default:
        return "plaintext";
    }
  };

  return (
    <div className="h-full bg-gray-900 text-gray-100">
      <Editor
        height="100%"
        defaultLanguage={getMonacoLanguage(language)}
        language={getMonacoLanguage(language)}
        value={value || (problem?.starterCode?.[language] || getDefaultStarterCode(language))}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          fontFamily: "JetBrains Mono, monospace",
          renderWhitespace: "selection",
          rulers: [80],
          bracketPairColorization: {
            enabled: true
          }
        }}
      />
    </div>
  );
}
