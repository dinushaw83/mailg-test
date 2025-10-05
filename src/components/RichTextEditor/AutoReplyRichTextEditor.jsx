import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, TextField, Link } from "@mui/material";
import useExtensions from "./useExtensions";
import { RichTextEditor, RichTextEditorProvider } from "mui-tiptap";
import EditorMenuControls from "./EditorMenuControls";

const AutoReplyRichTextEditor = ({ 
  content = "", 
  onChange, 
  isPlainText = false,
  onTogglePlainText 
}) => {
  const extensions = useExtensions({ });
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

  return (
    <Box sx={{ position: "relative" }}>
      {/* Editor Menu Controls - positioned above the editor */}
      {!isPlainText && rteRef.current?.editor && (
        <RichTextEditorProvider editor={rteRef.current?.editor}>
          <EditorMenuControls editor={rteRef.current?.editor} useCompactFormatting={false} containerClass="autoReplyContainer" />
        </RichTextEditorProvider>
      )}

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
          fontSize: "14px",
          zIndex: 10,
          padding: "2px 4px",
          borderRadius: "2px",
          "&:hover": { textDecoration: "underline" }
        }}
      >
        {isPlainText ? "Rich formatting >>" : "<< Plain Text"}
      </Link>
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
            hide: true, 
          },
        }}
        sx={{
          border: "1px solid #d9d9d9 !important", // Add border to the editor container
          "& .MuiInputBase-root": {
            border: "none", // Remove inner border if any
            fontSize: "13px"
          },
          "& .ProseMirror": {
            minHeight: "115p  x",
            maxHeight: "300px",
            height: isPlainText ? "200px" : "115px",
            overflowY: "auto",
            padding: "12px",
            "&:focus": {
              outline: "none"
            }
          }
        }}
      >
      </RichTextEditor>
    </Box>
  );
};

export default AutoReplyRichTextEditor;
