import styled from "@emotion/styled";
import React from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";
import Button from "@mui/material/Button";
import { Icon } from "../InboxView/ActionBar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import RadioSection from "./RadioSection";

const Container = styled.div`
  width: 300px; /* Fixed width for the right panel */
  min-width: 200px; /* Minimum width */
  border-left: 1px solid #ddd;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const QuickSettingsContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const QuickSettings = () => {
  const { showQuickSettings, setShowQuickSettings } = useGlobalContext();

  if (!showQuickSettings) return null;

  const densities = [
    {
      value: "default",
      label: "Default",
      imgSrc: "/assets/images/Default.png",
    },
    {
      value: "comfortable",
      label: "Comfortable",
      imgSrc: "/assets/images/Comfortable.png",
    },
    {
      value: "compact",
      label: "Compact",
      imgSrc: "/assets/images/Compact.png",
    },
  ];

  return (
    <Container>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem",
          paddingBottom: "0",
        }}
      >
        <Typography sx={{ fontSize: "1rem", color: "rgb(32, 33, 36" }}>Quick Settings</Typography>
        <Icon name="close" onClick={() => setShowQuickSettings(false)} label="Close" style={{ margin: 0 }} />
      </Box>

      <Box sx={{ padding: "1rem" }}>
        <Button
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 10,
            color: "rgb(26, 115, 232)",
            textTransform: "none",
            fontSize: "0.875rem",
            border: "none",
            boxShadow: "inset 0 0 0 1px rgba(100,121,143,0.12)",
          }}
        >
          See all settings
        </Button>
      </Box>

      <Divider sx={{ marginLeft: "0.2rem", marginRight: "0.5rem" }} />

      <QuickSettingsContent>
        <RadioSection title="Density" defaultValue="default" items={densities} />
        <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Configure your email preferences and settings here.</p>
      </QuickSettingsContent>
    </Container>
  );
};

export default QuickSettings;
