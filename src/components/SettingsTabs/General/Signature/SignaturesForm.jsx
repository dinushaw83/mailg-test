import React, { useState, useEffect, useRef } from "react";
import { useEditor } from "@tiptap/react";
import { useTheme } from "@mui/material/styles";
import { ColorPicker, MenuSelectFontSize, RichTextEditorProvider } from "mui-tiptap";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
    Popper,
    ClickAwayListener,
    Paper,
    Stack,
    Typography,
    IconButton,
    Tooltip,
} from "@mui/material";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FontFamilySelect from "./tools/FontFamilySelect";
import AlignMenu from "./tools/AlignMenu";
import MoreFormattingMenu from "./tools/MoreFormattingMenu";

import {
    SignaturesFormContainer,
    ToolbarSeparator,
    SignaturesListContainer,
    SignatureItem,
    SignatureName,
    SignatureContainer,
    StyledSignatureTable,
    SignatureToolbarContainer,
    MailGToolbarButton,
    ToolbarButton,
    StyledEditorContent,
    CreateNewButton,
} from "../styles";
import useExtensions from "../../../RichTextEditor/useExtensions";

const swatches = [
    // Grayscale
    "rgb(0, 0, 0)",
    "rgb(68, 68, 68)",
    "rgb(102, 102, 102)",
    "rgb(153, 153, 153)",
    "rgb(204, 204, 204)",
    "rgb(238, 238, 238)",
    "rgb(243, 243, 243)",
    "rgb(255, 255, 255)",
    // Brights
    "rgb(255, 0, 0)",
    "rgb(255, 153, 0)",
    "rgb(255, 255, 0)",
    "rgb(0, 255, 0)",
    "rgb(0, 255, 255)",
    "rgb(0, 0, 255)",
    "rgb(153, 0, 255)",
    "rgb(255, 0, 255)",
    // Row 3 (light tints)
    "rgb(244, 204, 204)",
    "rgb(252, 229, 205)",
    "rgb(255, 242, 204)",
    "rgb(217, 234, 211)",
    "rgb(208, 224, 227)",
    "rgb(207, 226, 243)",
    "rgb(217, 210, 233)",
    "rgb(234, 209, 220)",
    // Row 4
    "rgb(234, 153, 153)",
    "rgb(249, 203, 156)",
    "rgb(255, 229, 153)",
    "rgb(182, 215, 168)",
    "rgb(162, 196, 201)",
    "rgb(159, 197, 232)",
    "rgb(180, 167, 214)",
    "rgb(213, 166, 189)",
    // Row 5
    "rgb(224, 102, 102)",
    "rgb(246, 178, 107)",
    "rgb(255, 217, 102)",
    "rgb(147, 196, 125)",
    "rgb(118, 165, 175)",
    "rgb(111, 168, 220)",
    "rgb(142, 124, 195)",
    "rgb(194, 123, 160)",
    // Row 6
    "rgb(204, 0, 0)",
    "rgb(230, 145, 56)",
    "rgb(241, 194, 50)",
    "rgb(106, 168, 79)",
    "rgb(69, 129, 142)",
    "rgb(61, 133, 198)",
    "rgb(103, 78, 167)",
    "rgb(166, 77, 121)",
    // Row 7
    "rgb(153, 0, 0)",
    "rgb(180, 95, 6)",
    "rgb(191, 144, 0)",
    "rgb(56, 118, 29)",
    "rgb(19, 79, 92)",
    "rgb(11, 83, 148)",
    "rgb(53, 28, 117)",
    "rgb(116, 27, 71)",
    // Row 8
    "rgb(102, 0, 0)",
    "rgb(120, 63, 4)",
    "rgb(127, 96, 0)",
    "rgb(39, 78, 19)",
    "rgb(12, 52, 61)",
    "rgb(7, 55, 99)",
    "rgb(32, 18, 77)",
    "rgb(76, 17, 48)",
];

export default function SignaturesForm({
    signatures,
    activeSignature,
    setActiveSignature,
    setOpenDialog,
    setEditingSignature,
    editingSignature,
    editingSignatureData,
    setSignaturesState,
    setOpenDeleteDialog,
    signaturesState,
}) {
    return (
        <SignaturesFormContainer className="Tb">
            <div className="Tb">
                <Form
                    signatures={signatures}
                    activeSignature={activeSignature}
                    setActiveSignature={setActiveSignature}
                    setOpenDialog={setOpenDialog}
                    setEditingSignature={setEditingSignature}
                    editingSignature={editingSignature}
                    editingSignatureData={editingSignatureData}
                    setSignaturesState={setSignaturesState}
                    setOpenDeleteDialog={setOpenDeleteDialog}
                    signaturesState={signaturesState}
                />
                <div className="P4">
                    <CreateNewButton
                        aria-label="Create a new signature"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                            setOpenDialog(true);
                            setEditingSignature(null);
                        }}
                    >
                        <span className="material-symbols-outlined">add</span>
                        Create new
                    </CreateNewButton>
                </div>
                <div
                    className="Pr"
                    style={{
                        WebkitFontSmoothing: "antialiased",
                        fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                        fontSize: "0.875rem",
                        letterSpacing: "normal",
                        fontWeight: 500,
                        marginBottom: "8px",
                    }}
                >
                    Signature defaults
                </div>
                <div className="P2" style={{ display: "flex" }}>
                    <label className="aaJ" style={{ marginRight: "16px" }}>
                        <div
                            className="P0"
                            style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                letterSpacing: "normal",
                                color: "rgb(95, 99, 104)",
                                marginBottom: "4px",
                            }}
                        >
                            FOR NEW EMAILS USE
                        </div>
                        <select
                            className="Ps"
                            style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                display: "block",
                                width: "176px",
                            }}
                            value={signaturesState.useForNewEmails}
                            onChange={(e) => setSignaturesState({ ...signaturesState, useForNewEmails: e.target.value })}
                        >
                            <option value="-1">No signature</option>
                            {signatures.map((signature, index) => (
                                <option key={index} value={index}>{signature.name}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <div
                            className="P0"
                            style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                letterSpacing: "normal",
                                color: "rgb(95, 99, 104)",
                                marginBottom: "4px",
                            }}
                        >
                            ON REPLY/FORWARD USE
                        </div>
                        <select
                            className="Ps"
                            style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                display: "block",
                                width: "176px",
                            }}
                            value={signaturesState.useForRepliesAndForwards}
                            onChange={(e) => setSignaturesState({ ...signaturesState, useForRepliesAndForwards: e.target.value })}
                        >
                            <option value="-1">No signature</option>
                            {signatures.map((signature, index) => (
                                <option key={index} value={index}>{signature.name}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <label>
                    <input
                        className="TQ"
                        type="checkbox"
                        style={{
                            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                            margin: "0px",
                            fontSize: "100%",
                            marginTop: "16px",
                            fontWeight: "normal",
                        }}
                        checked={signaturesState.insertSignatureBeforeQuotedText}
                        onChange={(e) => setSignaturesState({ ...signaturesState, insertSignatureBeforeQuotedText: e.target.checked })}
                    />{" "}
                    Insert signature before the quoted text in replies, and remove the '--' line that precedes it.
                </label>
            </div>
        </SignaturesFormContainer>
    );
}

function Form({
    signatures,
    activeSignature,
    setActiveSignature,
    setOpenDialog,
    setEditingSignature,
    setSignaturesState,
    setOpenDeleteDialog,
    signaturesState,
}) {
    const theme = useTheme()
    const [content, setContent] = useState("");

    const [open, setOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [bgColor, setBgColor] = useState("#ffffff");
    const [textColor, setTextColor] = useState("#000000");
    const [fontFamily, setFontFamily] = useState("sans-serif");

    const [activeMarks, setActiveMarks] = useState({
        bold: false,
        italic: false,
        underline: false,
    });

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        setOpen((prev) => !prev);
    };

    const handleClose = () => {
        setOpen(false);
        setAnchorEl(null);
    };

    const editor = useEditor({
        extensions: useExtensions({ placeholder: "Create your signature…" }),
        content: activeSignature !== null ? signatures[activeSignature]?.content || "<p></p>" : "<p></p>",
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
    });

    const [linkAnchorEl, setLinkAnchorEl] = useState(null);
    const [linkText, setLinkText] = useState("");
    const [linkHref, setLinkHref] = useState("");
    const [hasTextSelection, setHasTextSelection] = useState(false);

    const openLinkPopover = (event) => {
        if (editor) {
            const { from, to, empty } = editor.state.selection;
            setHasTextSelection(!empty && from !== to);
        }
        setLinkAnchorEl(event.currentTarget);
    };

    useEffect(() => {
        if (!editor || activeSignature === null) return;

        const handleUpdate = () => {
            setSignaturesState(prev => {
                const updatedList = [...prev.list];
                updatedList[activeSignature] = {
                    ...updatedList[activeSignature],
                    content: editor.getHTML(),
                };
                return { ...prev, list: updatedList };
            });
        };

        // Listen directly to tiptap's update event — captures formatting and mark changes too
        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, activeSignature, setSignaturesState]);

    useEffect(() => {
        if (!editor) return;

        if (activeSignature !== prevSignatureRef.current) {
            const html = signatures[activeSignature]?.content || "<p></p>";
            editor.commands.setContent(html, false); // <-- ✨ pass `false` to restore marks correctly
            prevSignatureRef.current = activeSignature;
        }
    }, [activeSignature, editor, signatures]);

    const closeLinkPopover = () => {
        setLinkAnchorEl(null);
    };

    const canApply = Boolean(linkHref.trim()) && (hasTextSelection || linkText.trim());

    const applyLink = () => {
        if (!editor) return;
        if (hasTextSelection) {
            editor.chain().focus().setLink({ href: linkHref }).run();
        } else if (linkText.trim()) {
            editor.chain().focus().insertContent([
                { type: "text", text: linkText, marks: [{ type: "link", attrs: { href: linkHref } }] },
            ]).run();
        }
        setLinkHref("");
        setLinkText("");
        closeLinkPopover();
    };

    const handleMarkToggle = (mark) => {
        if (!editor) return;

        // Toggle the mark visually right away
        setActiveMarks((prev) => ({
            ...prev,
            [mark]: !prev[mark],
        }));

        // Apply the mark in Tiptap
        editor.chain().focus()[`toggle${mark.charAt(0).toUpperCase() + mark.slice(1)}`]().run();
    };

    const prevSignatureRef = useRef(null);

    useEffect(() => {
        if (!editor) return;

        // Only set content when switching signatures
        if (activeSignature !== prevSignatureRef.current) {
            const html = signatures[activeSignature]?.content || "<p></p>";
            editor.commands.setContent(html);
            prevSignatureRef.current = activeSignature;
        }
    }, [activeSignature, editor, signatures]);

    const handleSelectSignature = (index) => {
        if (activeSignature !== null && editor) {
            const html = editor.getHTML();
            setSignaturesState(prev => {
                const updatedList = [...prev.list];
                updatedList[activeSignature] = {
                    ...updatedList[activeSignature],
                    content: html,
                };
                return { ...prev, list: updatedList };
            });
        }
        setActiveSignature(index);
    };

    // auto
    useEffect(() => {
        if (activeSignature === null && signatures.length > 0) {
            setActiveSignature(0);
        }
    }, [activeSignature, signatures, setActiveSignature]);

    return (
        <RichTextEditorProvider editor={editor}>
            <div
                className="Ia"
                style={{
                    background: "white",
                    border: "1px solid rgb(218, 220, 224)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    display: "flex",
                    height: "168px",
                    width: "720px",
                }}
            >
                <SignaturesListContainer>
                    {signatures.map((signature, index) => (
                        <SignatureItem
                            key={signature.name}
                            onClick={() => handleSelectSignature(index)}
                            className={activeSignature === index ? "active" : ""}
                        >
                            <SignatureName>{signature.name}</SignatureName>
                            {activeSignature === index && (
                                <>
                                    <IconButton
                                        size="small"
                                        sx={{
                                            borderRadius: "50%",
                                            width: 32,
                                            height: 32,
                                            marginRight: "8px",
                                            color: "rgba(0,0,0,0.7)",
                                            "&:hover": { backgroundColor: "rgba(32,33,36,0.1)" },
                                        }}
                                        aria-label="Edit signature name"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDialog(true);
                                            setEditingSignature(index);
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                            edit
                                        </span>
                                    </IconButton>

                                    <IconButton
                                        size="small"
                                        sx={{
                                            borderRadius: "50%",
                                            width: 32,
                                            height: 32,
                                            color: "rgba(0,0,0,0.7)",
                                            "&:hover": { backgroundColor: "rgba(32,33,36,0.1)" },
                                        }}
                                        aria-label="Delete signature"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDeleteDialog(true);
                                            setEditingSignature(index);
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                            delete
                                        </span>
                                    </IconButton>
                                </>
                            )}
                        </SignatureItem>
                    ))}
                </SignaturesListContainer>
                <SignatureContainer className="IO">
                    <StyledSignatureTable className="An">
                        <tbody>
                            <tr>
                                <td
                                    className="Ap"
                                    style={{
                                        margin: "0px",
                                        width: "100%",
                                        backgroundColor: "rgb(255, 255, 255)",
                                        verticalAlign: "top",
                                    }}
                                >
                                    <div
                                        className="IN"
                                        style={{
                                            position: "relative",
                                            overflowY: "auto",
                                            overflowX: "hidden",
                                            minHeight: "100px",
                                            background: "#fff",
                                            padding: "8px",
                                            boxSizing: "border-box",
                                            border: "none",
                                            maxHeight: "0px",
                                        }}
                                    >
                                        <StyledEditorContent
                                            editor={editor}
                                            className="Am aiL IP Al editable Xp0HJf-LW-avf"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </StyledSignatureTable>
                    <SignatureToolbarContainer className="Vb IQ">
                        <div className="Vh" style={{ padding: "0px 0px 1px", display: "inline-block" }}>
                            <div
                                className="Vf"
                                style={{
                                    backgroundColor: "transparent",
                                    fontWeight: "normal",
                                    margin: "0px",
                                    padding: "0px",
                                }}
                            >
                                <span className="q0" style={{ display: "block" }}>
                                    <div
                                        className="aX"
                                        style={{
                                            zIndex: 10,
                                            overflow: "visible",
                                            margin: "0px",
                                            padding: "0px 4px",
                                            height: "auto",
                                            marginBottom: "0px",
                                            visibility: "visible",
                                        }}
                                    >
                                        <div className="aZ">
                                            <div
                                                className="J-Z"
                                                aria-label="Formatting options"
                                                role="toolbar"
                                                style={{
                                                    background: "rgb(255, 255, 255)",
                                                    borderTop: "1px solid rgb(229, 229, 229)",
                                                    borderBottom: "1px solid rgb(235, 235, 235)",
                                                    outline: "0px",
                                                    position: "relative",
                                                    zoom: 1,
                                                    border: "none",
                                                    borderRadius: "2px",
                                                    whiteSpace: "nowrap",
                                                    WebkitBoxAlign: "center",
                                                    alignItems: "center",
                                                    display: "block",
                                                    margin: "0px",
                                                    padding: "0px",
                                                    boxShadow: "none",
                                                    userSelect: "none",
                                                }}
                                            >
                                                <Tooltip
                                                    title="Font"
                                                    placement="bottom"
                                                >
                                                    <MailGToolbarButton aria-label="Font family" className={`J-Z-M-I J-J5-Ji`}>
                                                        <FontFamilySelect
                                                            value={fontFamily}
                                                            onChange={(font) => {
                                                                setFontFamily(font);
                                                                editor?.chain().focus().setFontFamily(font).run();
                                                            }}
                                                        />
                                                    </MailGToolbarButton>
                                                </Tooltip>
                                                <ToolbarSeparator />
                                                <MailGToolbarButton aria-label="Font family" className={`J-Z-M-I J-J5-Ji`}>
                                                    <MenuSelectFontSize
                                                        hideUnsetOption
                                                        options={[
                                                            { value: "10px", label: <span style={{ fontSize: "10px" }}>Small</span> },
                                                            { value: "13px", label: <span style={{ fontSize: "13px" }}>Normal</span> },
                                                            { value: "18px", label: <span style={{ fontSize: "18px" }}>Large</span> },
                                                            { value: "32px", label: <span style={{ fontSize: "32px" }}>Huge</span> },
                                                        ]}
                                                        aria-label="Size ‪(⌘⇧-, ⌘⇧+)‬"
                                                    />
                                                </MailGToolbarButton>
                                                <ToolbarSeparator />
                                                <MailGToolbarButton aria-label="Bold (⌘B)" role="button" onClick={() => handleMarkToggle("bold")}
                                                    className={`J-Z-M-I J-J5-Ji ${editor?.isActive("bold") ? "active" : ""}`}

                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                        format_bold 
                                                    </span>
                                                </MailGToolbarButton>
                                                <MailGToolbarButton aria-label="Italic (⌘I)" role="button"
                                                    onClick={() => handleMarkToggle("italic")}
                                                    className={`J-Z-M-I J-J5-Ji ${editor?.isActive("italic") ? "active" : ""}`}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                        format_italic
                                                    </span>
                                                </MailGToolbarButton>
                                                <MailGToolbarButton aria-label="Underline (⌘U)" role="button"
                                                    onClick={() => handleMarkToggle("underline")}
                                                    className={`J-Z-M-I J-J5-Ji ${editor?.isActive("underline") ? "active" : ""}`}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                        format_underlined
                                                    </span>
                                                </MailGToolbarButton>
                                                <ToolbarButton
                                                    role="button"
                                                    aria-label="Text colour"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    className="J-Z-M-I J-J5-Ji"
                                                    onClick={handleClick}
                                                >
                                                    <FormatColorTextIcon
                                                        sx={{
                                                            fontSize: 20,
                                                            marginLeft: "4px",
                                                            position: "relative",
                                                            top: "1px",
                                                        }}
                                                    />
                                                    <ArrowDropDownIcon
                                                        sx={{
                                                            fontSize: 20,
                                                        }}
                                                    />

                                                </ToolbarButton>

                                                <Popper
                                                    id="dual-color-picker"
                                                    open={open}
                                                    anchorEl={anchorEl}
                                                    placement="top"
                                                    style={{ zIndex: theme.zIndex.tooltip }}
                                                    className="dual-color-picker"
                                                >
                                                    <ClickAwayListener onClickAway={handleClose} mouseEvent="onMouseDown" touchEvent="onTouchStart">
                                                        <Paper elevation={5} sx={{ p: 2.5, pb: 1 }}>
                                                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                                                <div>
                                                                    <Typography variant="caption" sx={{ display: "block", mb: 2, fontSize: 14 }}>
                                                                        Background color
                                                                    </Typography>
                                                                    <ColorPicker
                                                                        value={bgColor}
                                                                        onChange={(color) => {
                                                                            setBgColor(color);
                                                                            editor?.chain().focus().setHighlight({ color }).run();
                                                                        }}
                                                                        swatchColors={swatches}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Typography variant="caption" sx={{ display: "block", mb: 2, fontSize: 14 }}>
                                                                        Text color
                                                                    </Typography>
                                                                    <ColorPicker
                                                                        value={textColor}
                                                                        onChange={(color) => {
                                                                            setTextColor(color);
                                                                            editor?.chain().focus().setColor(color).run();
                                                                        }}
                                                                        swatchColors={swatches}
                                                                    />
                                                                </div>
                                                            </Stack>
                                                        </Paper>
                                                    </ClickAwayListener>
                                                </Popper>

                                                <ToolbarSeparator />
                                                <ToolbarButton role="button" aria-label="Link (⌘K)" className="J-Z-M-I J-J5-Ji" onClick={openLinkPopover}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                        insert_link
                                                    </span>
                                                </ToolbarButton>
                                                <Popper open={Boolean(linkAnchorEl)} anchorEl={linkAnchorEl} placement="top" style={{ zIndex: 1500 }}>
                                                    <ClickAwayListener
                                                        onClickAway={closeLinkPopover}
                                                        mouseEvent="onMouseDown"
                                                        touchEvent="onTouchStart"
                                                    >
                                                        <Paper
                                                            elevation={5}
                                                            sx={{
                                                                p: 1,
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: 0.5,
                                                                padding: "16px 32px 16px 16px",
                                                            }}
                                                        >
                                                            {!hasTextSelection && (
                                                                <div style={{ position: "relative", width: 260 }}>
                                                                    <input
                                                                        type="text"
                                                                        value={linkText}
                                                                        onChange={(e) => setLinkText(e.target.value)}
                                                                        placeholder="Text"
                                                                        onFocus={(e) => {
                                                                            e.target.placeholder = "";
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            if (!e.target.value) e.target.placeholder = "Text";
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") applyLink();
                                                                        }}
                                                                        style={{
                                                                            width: "80%",
                                                                            padding: "6px 10px 6px 34px",
                                                                            fontSize: "14px",
                                                                            border: "1px solid rgba(0,0,0,0.23)",
                                                                            borderRadius: 4,
                                                                            outline: "none",
                                                                            marginBottom: "4px",
                                                                        }}
                                                                    />
                                                                    <svg
                                                                        focusable="false"
                                                                        viewBox="0 -960 960 960"
                                                                        height="20"
                                                                        width="20"
                                                                        style={{
                                                                            position: "absolute",
                                                                            left: 8,
                                                                            top: "46%",
                                                                            transform: "translateY(-50%)",
                                                                            userSelect: "none",
                                                                            pointerEvents: "none",
                                                                            color: "rgba(0,0,0,0.6)",
                                                                        }}
                                                                    >
                                                                        <path d="M192-360v-72H576v72H192Zm0-168v-72H768v72H192Z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <div style={{ position: "relative", width: 260 }}>
                                                                    <input
                                                                        type="text"
                                                                        value={linkHref}
                                                                        onChange={(e) => setLinkHref(e.target.value)}
                                                                        placeholder="URL"
                                                                        onFocus={(e) => {
                                                                            e.target.placeholder = "";
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            if (!e.target.value) e.target.placeholder = "URL";
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") applyLink();
                                                                        }}
                                                                        style={{
                                                                            width: "80%",
                                                                            padding: "6px 10px 6px 34px",
                                                                            fontSize: "14px",
                                                                            border: "1px solid rgba(0,0,0,0.23)",
                                                                            borderRadius: 4,
                                                                            outline: "none",
                                                                        }}
                                                                    />
                                                                    <svg
                                                                        focusable="false"
                                                                        viewBox="0 -960 960 960"
                                                                        height="20"
                                                                        width="20"
                                                                        style={{
                                                                            position: "absolute",
                                                                            left: 8,
                                                                            top: "50%",
                                                                            transform: "translateY(-50%)",
                                                                            userSelect: "none",
                                                                            pointerEvents: "none",
                                                                            color: "rgba(0,0,0,0.6)",
                                                                        }}
                                                                    >
                                                                        <path d="M432-288H288q-79.68,0-135.84-56.23T96-480.23T152.16-616T288-672H432v72H288q-50,0-85,35t-35,85t35,85t85,35H432v72ZM336-444v-72H624v72H336ZM528-288v-72H672q50,0 85-35t35-85t-35-85t-85-35H528v-72H672q79.68,0 135.84,56.23t56.16,136T807.84-344T672-288H528Z"></path>
                                                                    </svg>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    disabled={!canApply}
                                                                    onClick={applyLink}
                                                                    style={{
                                                                        background: "transparent",
                                                                        border: "none",
                                                                        padding: "4px 6px",
                                                                        fontSize: 14,
                                                                        fontWeight: 500,
                                                                        color: canApply ? "#1a73e8" : "rgba(0,0,0,0.38)",
                                                                        cursor: canApply ? "pointer" : "default",
                                                                    }}
                                                                >
                                                                    Apply
                                                                </button>
                                                            </div>
                                                        </Paper>
                                                    </ClickAwayListener>
                                                </Popper>

                                                <ToolbarButton role="button" aria-label="Insert image" className="J-Z-M-I J-J5-Ji">
                                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                        insert_photo
                                                    </span>
                                                </ToolbarButton>
                                                <ToolbarSeparator />
                                                <AlignMenu editor={editor} />
                                                <ToolbarButton
                                                    role="button"
                                                    aria-label="Numbered list ‪(⌘⇧7)‬"
                                                    aria-pressed={editor?.isActive("orderedList")}
                                                    className={`J-Z-M-I J-J5-Ji ${editor?.isActive("orderedList") ? "active" : ""}`}
                                                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                                >
                                                    <FormatListNumberedIcon sx={{ fontSize: 20 }} />
                                                </ToolbarButton>
                                                <ToolbarSeparator />
                                                <MoreFormattingMenu editor={editor} />
                                            </div>
                                        </div>
                                    </div>
                                </span>
                            </div>
                        </div>
                    </SignatureToolbarContainer>

                </SignatureContainer>
            </div>
        </RichTextEditorProvider>
    );
}
