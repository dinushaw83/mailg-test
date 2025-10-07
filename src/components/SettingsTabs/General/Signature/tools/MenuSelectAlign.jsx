import { Select, MenuItem } from "@mui/material";

export default function MenuSelectAlign({ editor }) {
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
