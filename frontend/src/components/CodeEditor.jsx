import { useEffect, useRef, useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

const languageExtensions = {
  javascript: [javascript()],
  python: [python()],
  java: [java()],
  cpp: [cpp()]
};

export default function CodeEditor({ 
  value, 
  onChange, 
  onCursorActivity, 
  language, 
  readOnly = false 
}) {
  const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);
  const editorRef = useRef(null);
  const updateTimeoutRef = useRef();

  const handleChange = useCallback((val) => {
    if (!isUpdatingFromRemote && onChange) {
      // Debounce the onChange call
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        onChange(val);
      }, 300);
    }
  }, [isUpdatingFromRemote, onChange]);

  const handleCursorActivity = useCallback((view) => {
    if (!isUpdatingFromRemote && onCursorActivity) {
      const cursor = view.state.selection.main.head;
      const line = view.state.doc.lineAt(cursor);
      const ch = cursor - line.from;
      onCursorActivity({ line: line.number - 1, ch });
    }
  }, [isUpdatingFromRemote, onCursorActivity]);

  const extensions = [
    languageExtensions[language] || languageExtensions.javascript,
    oneDark,
    EditorView.theme({
      '&': {
        fontSize: '14px',
        height: '100%'
      },
      '.cm-content': {
        padding: '12px',
        minHeight: '400px'
      },
      '.cm-focused': {
        outline: 'none'
      },
      '.cm-editor': {
        height: '100%'
      },
      '.cm-scroller': {
        height: '100%'
      }
    }),
    EditorView.lineWrapping,
    EditorState.readOnly.of(readOnly),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet && !isUpdatingFromRemote) {
        handleCursorActivity(update.view);
      }
    })
  ].flat();

  return (
    <div className="h-full border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      <CodeMirror
        value={value || ''}
        onChange={handleChange}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false,
          searchKeymap: true,
        }}
        ref={editorRef}
        readOnly={readOnly}
      />
    </div>
  );
}