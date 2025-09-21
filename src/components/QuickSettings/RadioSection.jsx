import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import Typography from "@mui/material/Typography";
import React, { useState } from "react";

const RadioItem = ({ value, label, selectedValue, handleChange, handleCustomize, imgSrc }) => {
  const handleItemClick = (event) => {
    // Don't trigger if clicking on the customize button
    if (event.target.closest("button")) {
      return;
    }
    // Create a synthetic event for the radio button
    const syntheticEvent = {
      target: { value: value },
    };
    handleChange(syntheticEvent);
  };

  return (
    <Box
      onClick={handleItemClick}
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: "1rem",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.5rem",
        cursor: "pointer",
        padding: "0.25rem",
        borderRadius: "4px",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "row", gap: "1rem", alignItems: "center" }}>
        <Radio
          checked={selectedValue === value}
          onChange={handleChange}
          value={value}
          name="radio-buttons"
          slotProps={{ input: { "aria-label": label } }}
        />
        <Box
          sx={{
            fontSize: "0.875rem",
            color: "rgb(32, 33, 36)",
            gap: "0.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
          }}
        >
          <Box>{label}</Box>
          {!!handleCustomize && (
            <Button
              size="small"
              sx={{
                borderRadius: "20px",
                padding: "0px 12px",
                textTransform: "none",
                justifyContent: "flex-start",
                minWidth: "auto",
                width: "fit-content",
                marginLeft: "-12px",
                paddingLeft: "12px",
              }}
              onClick={handleCustomize}
            >
              Customize
            </Button>
          )}
        </Box>
      </Box>
      <Box>
        <img src={imgSrc} alt={label} />
      </Box>
    </Box>
  );
};

const RadioSection = ({ title, items, defaultValue }) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  const handleChange = (event) => {
    setSelectedValue(event.target.value);
  };

  return (
    <Box>
      <Box sx={{ padding: "1rem", paddingBottom: "0" }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "#444746",
            fontWeight: "500",
            letterSpacing: "0.00834rem",
            marginBottom: "1rem",
          }}
        >
          {title}
        </Typography>

        {items.map((item) => (
          <RadioItem
            key={item.value}
            value={item.value}
            label={item.label}
            selectedValue={selectedValue}
            handleChange={handleChange}
            imgSrc={item.imgSrc}
            handleCustomize={item.handleCustomize}
          />
        ))}
      </Box>
      <Divider sx={{ marginLeft: "0.2rem", marginRight: "0.5rem" }} />
    </Box>
  );
};

export default RadioSection;
