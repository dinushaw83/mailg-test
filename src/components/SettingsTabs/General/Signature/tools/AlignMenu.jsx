import React, { useState } from "react";
import { ToolbarButton } from "../../styles";
import { MenuItem } from "@mui/material";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";
import { Popper, Paper, ClickAwayListener, MenuList } from "@mui/material";

const alignments = [
    { value: "left", icon: <FormatAlignLeftIcon /> },
    { value: "center", icon: <FormatAlignCenterIcon /> },
    { value: "right", icon: <FormatAlignRightIcon /> },
    { value: "justify", icon: <FormatAlignJustifyIcon /> },
];

export default function AlignMenu({ editor }) {
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
