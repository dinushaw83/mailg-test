import React, { useState } from "react";
import { ColorPicker, MenuSelectFontSize, RichTextEditorProvider } from "mui-tiptap";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
    MenuItem,
    Select,
    Popper,
    ClickAwayListener,
    Paper,
    Stack,
    Typography,
    IconButton,
    Menu,
    ListItemIcon,
    MenuList
} from "@mui/material";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import { useEditor } from "@tiptap/react";
import { useTheme } from "@mui/material/styles";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";
import CheckIcon from "@mui/icons-material/Check";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import FormatIndentIncreaseIcon from "@mui/icons-material/FormatIndentIncrease";
import FormatIndentDecreaseIcon from "@mui/icons-material/FormatIndentDecrease";

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
                />
                <div className="P4">
                    <button
                        className="P5"
                        aria-label="Create a new signature"
                        role="button"
                        tabIndex="0"
                        style={{
                            border: "none",
                            background: "none",
                            borderRadius: "4px",
                            outline: "none",
                            padding: "0px 16px",
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
                            boxSizing: "border-box",
                            cursor: "pointer",
                            fontWeight: 500,
                            height: "36px",
                            minWidth: "80px",
                            boxShadow: "rgb(218, 220, 224) 0px 0px 0px 1px inset",
                            color: "rgb(26, 115, 232)",
                            marginBottom: "32px",
                            marginTop: "8px",
                            width: "240px",
                        }}
                        onClick={() => setOpenDialog(true)}
                    >
                        Create new
                    </button>
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
                        >
                            <option value="-1">No signature</option>
                            <option value="4582351273062553595">sas</option>
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
                        >
                            <option value="-1">No signature</option>
                            <option value="4582351273062553595">sas</option>
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
                    />{" "}
                    Insert signature before the quoted text in replies, and remove the '--' line that precedes it.
                </label>
            </div>
        </SignaturesFormContainer>
    );
}

export function MenuSelectAlign({ editor }) {
    if (!editor) return null;

    return (
        <Select
            value={editor.getAttributes("paragraph").textAlign || "left"}
            onChange={(e) => {
                editor.chain().focus().setTextAlign(e.target.value).run();
            }}
            variant="standard"
            disableUnderline
            sx={{ minWidth: 80 }}
        >
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="center">Center</MenuItem>
            <MenuItem value="right">Right</MenuItem>
            <MenuItem value="justify">Justify</MenuItem>
        </Select>
    );
}

function MoreFormattingMenu({ editor }) {
    const [anchorEl, setAnchorEl] = useState(null);

    const open = Boolean(anchorEl);
    const handleOpen = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    return (
        <>
            <ToolbarButton
                role="button"
                aria-label="More formatting options"
                aria-haspopup="true"
                aria-expanded={open ? "true" : "false"}
                onClick={handleOpen}
                className="J-Z-M-I J-J5-Ji"
            >
                <ArrowDropDownIcon sx={{ fontSize: 20 }} />
            </ToolbarButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "left" }}
                transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                PaperProps={{
                    sx: {
                        padding: 0,
                        minWidth: "auto",
                        "& .MuiMenuItem-root": {
                            padding: "2px 6px",
                            minHeight: "24px",
                        },
                        "& .MuiListItemIcon-root": {
                            minWidth: "20px",
                        },
                    },
                }}
            >
                <MenuItem onClick={() => { editor.chain().focus().toggleStrike().run(); handleClose(); }}>
                    <ListItemIcon><FormatStrikethroughIcon fontSize="small" /></ListItemIcon>
                </MenuItem>

                <MenuItem onClick={() => { editor.chain().focus().toggleBlockquote().run(); handleClose(); }}>
                    <ListItemIcon><FormatQuoteIcon fontSize="small" /></ListItemIcon>
                </MenuItem>

                <MenuItem onClick={() => { editor.chain().focus().sinkListItem("listItem").run(); handleClose(); }}>
                    <ListItemIcon><FormatIndentIncreaseIcon fontSize="small" /></ListItemIcon>
                </MenuItem>

                <MenuItem onClick={() => { editor.chain().focus().liftListItem("listItem").run(); handleClose(); }}>
                    <ListItemIcon><FormatIndentDecreaseIcon fontSize="small" /></ListItemIcon>
                </MenuItem>

                <MenuItem onClick={() => { editor.chain().focus().toggleBulletList().run(); handleClose(); }}>
                    <ListItemIcon><FormatListBulletedIcon fontSize="small" /></ListItemIcon>
                </MenuItem>

                <MenuItem onClick={() => { editor.chain().focus().toggleOrderedList().run(); handleClose(); }}>
                    <ListItemIcon><FormatListNumberedIcon fontSize="small" /></ListItemIcon>
                </MenuItem>
            </Menu>
        </>
    );
}

const alignments = [
    { value: "left", icon: <FormatAlignLeftIcon /> },
    { value: "center", icon: <FormatAlignCenterIcon /> },
    { value: "right", icon: <FormatAlignRightIcon /> },
    { value: "justify", icon: <FormatAlignJustifyIcon /> },
];

export function AlignMenu({ editor }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    if (!editor) return null;

    const current = editor.getAttributes("paragraph").textAlign || "left";

    const handleClick = (event) => {
        setAnchorEl(anchorEl ? null : event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const applyAlign = (align) => {
        editor.chain().focus().setTextAlign(align).run();
        handleClose();
    };

    return (
        <>
            <ToolbarButton role="button" aria-label="Link (⌘K)" className="J-Z-M-I J-J5-Ji" onClick={handleClick}>
                {alignments.find((a) => a.value === current)?.icon &&
                    React.cloneElement(alignments.find((a) => a.value === current)?.icon, {
                        sx: { fontSize: 20 },
                })}
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    arrow_drop_down
                </span>
            </ToolbarButton>

            <Popper open={open} anchorEl={anchorEl} placement="top">
                <ClickAwayListener onClickAway={handleClose}>
                    <Paper elevation={3}>
                        <MenuList>
                            {alignments.map((a) => (
                                <MenuItem key={a.value} onClick={() => applyAlign(a.value)}>
                                    {a.icon}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </>
    );
}

export function FontFamilySelect({ value, onChange }) {
    const fontOptions = [
        { label: "Sans Serif", value: "sans-serif", style: { fontFamily: "Arial, sans-serif" } },
        { label: "Serif", value: "serif", style: { fontFamily: "Georgia, serif" } },
        { label: "Fixed Width", value: "monospace", style: { fontFamily: "'Courier New', monospace" } },
        { label: "Wide", value: "Arial Black", style: { fontFamily: "'Arial Black', Gadget, sans-serif", fontWeight: 700 } },
        { label: "Narrow", value: "Arial Narrow", style: { fontFamily: "'Arial Narrow', sans-serif" } },
        { label: "Comic Sans MS", value: "Comic Sans MS", style: { fontFamily: "'Comic Sans MS', cursive" } },
        { label: "Garamond", value: "Garamond", style: { fontFamily: "Garamond, serif" } },
        { label: "Georgia", value: "Georgia", style: { fontFamily: "Georgia, serif" } },
        { label: "Tahoma", value: "Tahoma", style: { fontFamily: "Tahoma, sans-serif" } },
        { label: "Trebuchet MS", value: "Trebuchet MS", style: { fontFamily: "'Trebuchet MS', sans-serif" } },
        { label: "Verdana", value: "Verdana", style: { fontFamily: "Verdana, sans-serif" } },
    ];

    return (
        <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            variant="standard"
            disableUnderline
            IconComponent={ArrowDropDownIcon}
            renderValue={(selected) => {
                const selectedFont = fontOptions.find((f) => f.value === selected);
                return (
                    <Typography
                        sx={{
                            ...selectedFont?.style,
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {selectedFont?.label}
                    </Typography>
                );
            }}
            sx={{
                width: "90px",
                fontSize: "0.875rem",
                fontWeight: 500,
                "& .MuiSelect-select": {
                    padding: "0 24px 0 4px",
                    minHeight: "20px",
                    lineHeight: "20px",
                },
            }}
            MenuProps={{
                PaperProps: {
                    sx: {
                        borderRadius: "8px",
                        mt: 1,
                        minWidth: "160px",
                        "& .MuiMenuItem-root": {
                            padding: "6px 16px",
                        },
                    },
                },
            }}
        >
            {fontOptions.map((font) => (
                <MenuItem key={font.value} value={font.value}>
                    {value === font.value && (
                        <ListItemIcon sx={{ minWidth: 22, mr: 0 }}>
                            <CheckIcon fontSize="small" />
                        </ListItemIcon>
                    )}
                    <Typography sx={{ ...font.style, fontSize: "1rem" }}>
                        {font.label}
                    </Typography>
                </MenuItem>
            ))}
        </Select>
    );
}

function Form({
    signatures,
    activeSignature,
    setActiveSignature,
    setOpenDialog,
    setEditingSignature,
    editingSignature,
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
        extensions: useExtensions({
            placeholder: "Create your signature…",
        }),
        content: "<p></p>",
        onUpdate: ({ editor }) => setContent(editor.getHTML()),
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
                            onClick={() => setActiveSignature(index)}
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
                                            // open delete confirmation or logic here
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
                                                <MailGToolbarButton aria-label="Font family" className={`J-Z-M-I J-J5-Ji`}>
                                                    <FontFamilySelect
                                                        value={fontFamily}
                                                        onChange={(font) => {
                                                            setFontFamily(font);
                                                            editor?.chain().focus().setFontFamily(font).run();
                                                        }}
                                                    />
                                                </MailGToolbarButton>
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
