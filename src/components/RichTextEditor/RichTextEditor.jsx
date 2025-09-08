import { Lock, LockOpen, TextFields } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useCallback, useRef, useState } from "react";
import {
  LinkBubbleMenu,
  MenuButton,
  RichTextEditor,
  RichTextReadOnly,
  TableBubbleMenu,
  insertImages,
} from "mui-tiptap";
import EditorMenuControls from "./EditorMenuControls";
import useExtensions from "./useExtensions";
import styles from "../ComposeEmail/ComposeEmail.module.css";

function fileListToImageFiles(fileList) {
  // You may want to use a package like attr-accept
  // (https://www.npmjs.com/package/attr-accept) to restrict to certain file
  // types.
  return Array.from(fileList).filter((file) => {
    const mimeType = (file.type || "").toLowerCase();
    return mimeType.startsWith("image/");
  });
}

export default function Editor({ content, onChange, onSend, onDelete }) {
  const extensions = useExtensions({
    placeholder: "",
  });
  const rteRef = useRef(null);
  const [isEditable, setIsEditable] = useState(true);
  const [showMenuBar, setShowMenuBar] = useState(false);

  const handleNewImageFiles = useCallback(
    (files, insertPosition) => {
      if (!rteRef.current?.editor) {
        return;
      }

      const attributesForImageFiles = files.map((file) => ({
        src: URL.createObjectURL(file),
        alt: file.name,
      }));

      insertImages({
        images: attributesForImageFiles,
        editor: rteRef.current.editor,
        position: insertPosition,
      });
    },
    []
  );

  // Allow for dropping images into the editor
  const handleDrop =
    useCallback(
      (view, event, _slice, _moved) => {
        if (!(event instanceof DragEvent) || !event.dataTransfer) {
          return false;
        }

        const imageFiles = fileListToImageFiles(event.dataTransfer.files);
        if (imageFiles.length > 0) {
          const insertPosition = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          })?.pos;

          handleNewImageFiles(imageFiles, insertPosition);

          // Return true to treat the event as handled. We call preventDefault
          // ourselves for good measure.
          event.preventDefault();
          return true;
        }

        return false;
      },
      [handleNewImageFiles]
    );

  // Allow for pasting images
  const handlePaste =
    useCallback(
      (_view, event, _slice) => {
        if (!event.clipboardData) {
          return false;
        }

        const pastedImageFiles = fileListToImageFiles(
          event.clipboardData.files
        );
        if (pastedImageFiles.length > 0) {
          handleNewImageFiles(pastedImageFiles);
          // Return true to mark the paste event as handled. This can for
          // instance prevent redundant copies of the same image showing up,
          // like if you right-click and copy an image from within the editor
          // (in which case it will be added to the clipboard both as a file and
          // as HTML, which Tiptap would otherwise separately parse.)
          return true;
        }

        // We return false here to allow the standard paste-handler to run.
        return false;
      },
      [handleNewImageFiles]
    );

  // Set up editor change handler
  const handleEditorChange = useCallback(({ editor }) => {
    const html = editor.getHTML();
    const plainText = editor.getText();
    onChange?.(html, plainText);
  }, [onChange]);

  return (
    <>
      <RichTextEditor
        ref={rteRef}
        extensions={extensions}
        content={content}
        onUpdate={handleEditorChange}
        editable={isEditable}
        editorProps={{
          handleDrop: handleDrop,
          handlePaste: handlePaste,
        }}
        RichTextFieldProps={{
          variant: "standard",
          MenuBarProps: {
            hide: !showMenuBar,
          },
          // Below is an example of adding a toggle within the outlined field
          // for showing/hiding the editor menu bar, and a "submit" button for
          // saving/viewing the HTML content
          footer: (
            <Stack
              direction="row"
              spacing={2}
              sx={{
                py: 1,
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: "relative", width: "100%" }}>
                <div className={styles.sendButtonContainer}>
                  <div
                    aria-label="Send ‪(⌘Enter)‬"
                    role="button"
                    tabIndex="1"
                    style={{
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      verticalAlign: "middle",
                      boxShadow: "none",
                      WebkitUserDrag: "none",
                      lineHeight: "18px",
                      outline: "none",
                      padding: "0px 16px",
                      border: "none",
                      WebkitBoxAlign: "center",
                      alignItems: "center",
                      display: "inline-flex",
                      WebkitBoxPack: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 0,
                      WebkitFontSmoothing: "antialiased",
                      fontSize: "0.875rem",
                      letterSpacing: "normal",
                      backgroundImage: "none",
                      boxSizing: "border-box",
                      fontWeight: 500,
                      height: "36px",
                      color: "rgb(255, 255, 255)",
                      margin: "0px",
                      marginRight: "0px",
                      maxWidth: "104px",
                      minWidth: "72px",
                      cursor: "pointer",
                      borderRadius: "18px 0px 0px 18px",
                      userSelect: "none",
                    }}
                    onClick={onSend}
                  >
                    Send
                  </div>
                  <div
                    aria-expanded="false"
                    aria-haspopup="true"
                    aria-label="More send options"
                    role="button"
                    tabIndex="1"
                    style={{
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      boxShadow: "none",
                      WebkitUserDrag: "none",
                      lineHeight: "18px",
                      outline: "none",
                      border: "none",
                      WebkitBoxAlign: "center",
                      alignItems: "center",
                      display: "inline-flex",
                      WebkitBoxPack: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 0,
                      WebkitFontSmoothing: "antialiased",
                      fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      fontSize: "0.875rem",
                      letterSpacing: "normal",
                      backgroundImage: "none",
                      boxSizing: "border-box",
                      fontWeight: 500,
                      height: "36px",
                      color: "rgb(255, 255, 255)",
                      padding: "0px 8px",
                      minWidth: "24px",
                      borderLeft: "1px solid rgb(6, 46, 111)",
                      cursor: "pointer",
                      borderRadius: "0px 18px 18px 0px",
                      userSelect: "none",
                    }}
                  >
                    <span className="material-symbols-outlined">arrow_drop_down</span>
                  </div>
                </div>

                {showMenuBar && <EditorMenuControls editor={rteRef.current?.editor} />}
                <MenuButton
                  value="formatting"
                  tooltipLabel={
                    showMenuBar ? "Hide formatting" : "Show formatting"
                  }
                  size="small"
                  onClick={() => setShowMenuBar((currentState) => !currentState)}
                  selected={showMenuBar}
                  IconComponent={TextFields}
                />

                <MenuButton
                  value="formatting"
                  tooltipLabel={
                    isEditable
                      ? "Prevent edits (use read-only mode)"
                      : "Allow edits"
                  }
                  size="small"
                  onClick={() => setIsEditable((currentState) => !currentState)}
                  selected={!isEditable}
                  IconComponent={isEditable ? Lock : LockOpen}
                />
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>

                <button className={styles.deleteButton} onClick={onDelete} title="Delete">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
              
            </Stack>
          ),
        }}
        sx={{
          // An example of how editor styles can be overridden. In this case,
          // setting where the scroll anchors to when jumping to headings. The
          // scroll margin isn't built in since it will likely vary depending on
          // where the editor itself is rendered (e.g. if there's a sticky nav
          // bar on your site).
          px: 1,
          mb: 1,
          "& .ProseMirror": {
            "& h1, & h2, & h3, & h4, & h5, & h6": {
              scrollMarginTop: showMenuBar ? 50 : 0,
            },
          },
        }}
      >
        {() => (
          <>
            <LinkBubbleMenu />
            <TableBubbleMenu />
          </>
        )}
      </RichTextEditor>

    </>
  );
}
