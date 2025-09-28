import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledIconButton = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== 'shape',
})(({ theme, shape }) => ({
    width: 36,
    height: 36,
    marginRight: '10px',
    transition: 'all 0.3s ease',
    backgroundColor: 'transparent',
    borderRadius: shape === 'round' ? '50%' : '4px',

    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        borderRadius: shape === 'round' ? '50% !important' : '0% !important',
    },
}));

const Icon = ({
    name,
    label,
    onClick,
    style,
    disabled,
    placement = 'bottom',
    size = 'small',
    shape = 'round', // "round" or "square"
    marginRight = "10px",
    _ref
}) => {
    return (
        <Tooltip title={label} placement={placement}>
            <StyledIconButton
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
                shape={shape} // Custom prop used in styled()
                style={style}
            >
                <span
                    className="material-symbols-outlined"
                    style={{
                        fontSize: 20,
                        color: 'rgb(68, 68, 68)',
                    }}
                >
                    {name}
                </span>
            </StyledIconButton>
        </Tooltip>
    );
};

export default Icon;
