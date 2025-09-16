import { IconButton, Tooltip } from "@mui/material";


const Icon = ({
    name,
    label,
    onClick,
    style,
    disabled,
    placement = "bottom",
    size = "small",
    marginRight = "10px",
    _ref
}) => {
    return (
        <Tooltip title={label} placement={placement}>
            <IconButton
                size={size}
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    marginRight: marginRight,
                    ...style,
                }}
                ref={_ref}
                onClick={onClick}
                disabled={disabled}
            >
                <span
                    className="material-symbols-outlined"
                    style={{
                        fontSize: 20,
                        color: "rgb(68, 68, 68)",
                    }}
                >
                    {name}
                </span>
            </IconButton>
        </Tooltip>
    );
};

export default Icon;