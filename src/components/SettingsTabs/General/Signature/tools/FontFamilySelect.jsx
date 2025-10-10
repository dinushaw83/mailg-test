import { Select, MenuItem, ListItemIcon, Typography } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";

export default function FontFamilySelect({ value, onChange }) {
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