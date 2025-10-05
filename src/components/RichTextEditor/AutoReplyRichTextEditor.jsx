import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, TextField, Link } from "@mui/material";
import useExtensions from "./useExtensions";
import { RichTextEditor, RichTextEditorProvider } from "mui-tiptap";
import EditorMenuControls from "./EditorMenuControls";
import InfoModal from "../ComposeEmail/InfoModal";

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
  const [formattingVisible, setFormattingVisible] = useState(false);
  const [showPlainTextModal, setShowPlainTextModal] = useState(false);

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

  useEffect(() => {
    if (rteRef.current?.editor) {
      setFormattingVisible(true)
    } else {
      setFormattingVisible(false)
    }
  }, [rteRef.current?.editor])

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

  // Check if content has styling/formatting
  const hasStyling = (htmlContent) => {
    if (!htmlContent) return false;
    
    // Remove the outer paragraph tags and check for formatting tags
    const innerContent = htmlContent.replace(/^<p[^>]*>|<\/p>$/g, '');
    
    // Check for common formatting tags
    const formattingTags = [
      '<strong>', '</strong>', '<b>', '</b>',
      '<em>', '</em>', '<i>', '</i>',
      '<u>', '</u>', '<span', '</span>',
      '<font', '</font>', 'style=',
      '<br>', '<br/>', '<br />'
    ];
    
    return formattingTags.some(tag => innerContent.includes(tag));
  };

  // Handle plain text toggle with confirmation
  const handlePlainTextToggle = () => {
    if (!isPlainText) {
      // Check if content has styling
      const currentContent = rteRef.current?.editor?.getHTML() || content;
      
      if (hasStyling(currentContent)) {
        // Show confirmation modal when switching from rich text to plain text with styling
        setShowPlainTextModal(true);
      } else {
        // Direct toggle when switching from rich text to plain text without styling
        if (rteRef.current?.editor) {
          const plainTextContent = rteRef.current.editor.getText();
          onChange?.(plainTextContent, plainTextContent);
        }
        onTogglePlainText?.();
      }
    } else {
      // Direct toggle when switching from plain text to rich text
      onTogglePlainText?.();
    }
  };

  // Handle OK button - strip formatting and toggle to plain text
  const handleConfirmPlainText = () => {
    if (rteRef.current?.editor) {
      // Get plain text content and strip all formatting
      const plainTextContent = rteRef.current.editor.getText();
      onChange?.(plainTextContent, plainTextContent);
    }
    setShowPlainTextModal(false);
    onTogglePlainText?.();
  };

  // Handle Cancel button - close modal without action
  const handleCancelPlainText = () => {
    setShowPlainTextModal(false);
  };

  return (
    <Box sx={{ position: "relative" }}>
      {/* Editor Menu Controls - positioned above the editor */}
      {!isPlainText && formattingVisible && (
        <RichTextEditorProvider editor={rteRef.current?.editor}>
          <EditorMenuControls editor={rteRef.current?.editor} useCompactFormatting={false} containerClass="autoReplyContainer" />
        </RichTextEditorProvider>
      )}

      {/* Plain Text Toggle Link */}
      <Link 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          handlePlainTextToggle();
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

      {/* Plain Text Confirmation Modal */}
      <InfoModal
        isOpen={showPlainTextModal}
        onClose={handleCancelPlainText}
        title="Confirm converting to plain text"
        message="Converting this message to plain text will lose some formatting and remove inserted items. Are you sure you want to continue?"
        modalBoxStyle={{ width: 560 }}
        buttons={[
          {
            text: "Cancel",
            className: "tertiary",
            onClick: handleCancelPlainText
          },
          {
            text: "OK",
            className: "primary",
            onClick: handleConfirmPlainText
          }
        ]}
      />
    </Box>
  );
};

export default AutoReplyRichTextEditor;
