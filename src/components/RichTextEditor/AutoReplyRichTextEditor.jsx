import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, TextField, Link } from "@mui/material";
import useExtensions from "./useExtensions";
import { RichTextEditor, RichTextEditorProvider } from "mui-tiptap";
import EditorMenuControls from "./EditorMenuControls";

const AutoReplyRichTextEditor = ({ 
  content = "", 
  onChange, 
  placeholder = "Enter your vacation message here...",
  isPlainText = false,
  onTogglePlainText 
}) => {
  const extensions = useExtensions({ placeholder });
  const rteRef = useRef(null);
  const [isEditable, setIsEditable] = useState(true);
  const [editor, setEditor] = useState(null);

  // Set up editor change handler
  const handleEditorChange = useCallback(
    ({ editor }) => {
      setEditor(editor);
      const html = editor.getHTML();
      const plainText = editor.getText();
      onChange?.(html, plainText);
    },
    [onChange]
  );

  // Handle content prop updates after initial render
  useEffect(() => {
    if (rteRef.current?.editor && content !== undefined) {
      const currentContent = rteRef.current.editor.getHTML();
      // Only update if the content has actually changed to avoid unnecessary updates
      if (currentContent !== content) {
        rteRef.current.editor.commands.setContent(content, false);
      }
    }
  }, [content]);

  if (isPlainText) {
    return (
      <Box sx={{ position: "relative" }}>
        <TextField
          multiline
          rows={8}
          value={content}
          onChange={(e) => onChange?.(e.target.value, e.target.value)}
          placeholder={placeholder}
          sx={{ 
            width: "100%",
            "& .MuiInputBase-root": {
              border: "1px solid #dadce0",
              fontSize: "13px"
            },
            "& .MuiInputBase-input": {
              padding: "12px"
            }
          }}
        />
        
        {/* Plain Text Toggle Link */}
        <Link 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            onTogglePlainText?.();
          }}
          sx={{ 
            color: "#1a73e8", 
            textDecoration: "none",
            fontSize: "13px",
            position: "absolute",
            top: "8px",
            left: "8px",
            zIndex: 10,
            backgroundColor: "white",
            padding: "2px 4px",
            borderRadius: "2px",
            "&:hover": { textDecoration: "underline" }
          }}
        >
          {"Rich formatting >>"}
        </Link>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      {/* Editor Menu Controls - positioned above the editor */}
      {rteRef.current?.editor && (
        <RichTextEditorProvider editor={rteRef.current?.editor}>
          <EditorMenuControls editor={rteRef.current?.editor} useCompactFormatting={false} />
        </RichTextEditorProvider>
      )}

      {/* Rich Text Editor */}
      <RichTextEditor
        ref={rteRef}
        extensions={extensions}
        content={content}
        onUpdate={handleEditorChange}
        editable={isEditable}
        RichTextFieldProps={{
          variant: "standard",
          MenuBarProps: {
            hide: true, // Hide the default toolbar since we have our custom one
          },
        }}
        sx={{
          "& .MuiInputBase-root": {
            border: "1px solid #dadce0",
            fontSize: "13px"
          },
          "& .ProseMirror": {
            minHeight: "200px",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "12px",
            "&:focus": {
              outline: "none"
            }
          }
        }}
      >
        {() => null}
      </RichTextEditor>

      {/* Plain Text Toggle Link */}
      <Link 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          onTogglePlainText?.();
        }}
        sx={{ 
          color: "#1a73e8", 
          textDecoration: "none",
          fontSize: "13px",
          // position: "absolute",
          // top: "8px",
          // left: "8px",
          zIndex: 10,
          backgroundColor: "white",
          padding: "2px 4px",
          borderRadius: "2px",
          "&:hover": { textDecoration: "underline" }
        }}
      >
        {"<< Plain Text"}
      </Link>
    </Box>
  );
};

export default AutoReplyRichTextEditor;
