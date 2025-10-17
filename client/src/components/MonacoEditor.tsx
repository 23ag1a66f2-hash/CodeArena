import Editor from '@monaco-editor/react';
import { useState, useRef, useEffect } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  theme?: string;
  options?: any;
  disableCopyPaste?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  height = '400px',
  theme = 'vs-dark',
  options = {},
  disableCopyPaste = false
}: MonacoEditorProps) {
  const [hasError, setHasError] = useState(false);
  const editorRef = useRef<any>(null);

  // Cleanup copy-paste event listeners on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current?.cleanupCopyPaste) {
        editorRef.current.cleanupCopyPaste();
      }
    };
  }, []);

  const handleEditorChange = (newValue: string | undefined) => {
    try {
      onChange(newValue || '');
    } catch (error) {
      setHasError(true);
    }
  };

  const handleEditorMount = (editor: any) => {
    setHasError(false);
    editorRef.current = editor;
    
    // Disable copy-paste if requested
    if (disableCopyPaste) {
      // Add event listeners to prevent copy-paste operations
      const preventCopyPaste = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };

      const preventContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Add event listeners to the editor DOM element
      const editorElement = editor.getDomNode();
      if (editorElement) {
        editorElement.addEventListener('keydown', preventCopyPaste, true);
        editorElement.addEventListener('contextmenu', preventContextMenu, true);
      }

      // Store cleanup function
      editorRef.current.cleanupCopyPaste = () => {
        if (editorElement) {
          editorElement.removeEventListener('keydown', preventCopyPaste, true);
          editorElement.removeEventListener('contextmenu', preventContextMenu, true);
        }
      };
    }
  };

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded" style={{ height }}>
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">Editor Error</p>
          <p className="text-red-500 text-sm">Please refresh the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden" style={{ height }}>
      <Editor
        height={height}
        language={language === 'c' ? 'cpp' : language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          renderLineHighlight: 'none',
          glyphMargin: false,
          folding: false,
          // Disable copy-paste operations when requested
          ...(disableCopyPaste && {
            copyWithSyntaxHighlighting: false,
            find: { addExtraSpaceOnTop: false },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            parameterHints: { enabled: false },
            suggest: { 
              showKeywords: false, 
              showSnippets: false, 
              showClasses: false, 
              showFunctions: false, 
              showVariables: false, 
              showConstants: false, 
              showEnums: false, 
              showModules: false, 
              showProperties: false, 
              showEvents: false, 
              showOperators: false, 
              showUnits: false, 
              showValues: false, 
              showColors: false, 
              showFiles: false, 
              showReferences: false, 
              showFolders: false, 
              showTypeParameters: false, 
              showWords: false 
            }
          }),
          ...options
        }}
      />
    </div>
  );
}