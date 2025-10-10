import React from "react";
import { RichTextEditor } from "mui-tiptap";
import useExtensions from "../../../RichTextEditor/useExtensions";

export default function SignatureEditor({ value, onChange, onEditorReady, children }) {
    const extensions = useExtensions({
        placeholder: "Create your signature…",
    });

    const [editorInstance, setEditorInstance] = React.useState(null);

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <RichTextEditor
                extensions={extensions}
                content={value || "<p></p>"}
                onUpdate={({ editor }) => {
                    onChange(editor.getHTML());
                }}
                onCreate={({ editor }) => {
                    setEditorInstance(editor);
                    if (onEditorReady) onEditorReady(editor);
                }}
                RichTextFieldProps={{
                    variant: "outlined",
                    MenuBarProps: { hide: true }, // ✅ hide default toolbar
                }}
                sx={{
                    "& .MuiTiptap-RichTextField-root": {
                        border: "1px solid #dadce0",
                        borderRadius: "8px 8px 0 0",
                        overflow: "hidden",
                    },
                    "& .MuiTiptap-RichTextField-content": {
                        border: 0,
                        background: "#fff",
                        // minHeight: "120px",
                        padding: "8px",
                        fontFamily: `"Google Sans", Roboto, Arial, sans-serif`,
                        fontSize: "0.875rem",
                    },
                }}
            />

            {/* ✅ custom toolbar */}
            <div
                style={{
                    border: "1px solid #dadce0",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                {children && children(editorInstance)}
            </div>
        </div>
    );
}
