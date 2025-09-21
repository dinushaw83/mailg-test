import styled from "@emotion/styled";
import React from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";
import Button from "@mui/material/Button";
import { Icon } from "../InboxView/ActionBar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import RadioSection from "./RadioSection";
import Apps from "./Apps";
import Themes from "./Themes";
import Threading from "./Threading";

const Container = styled.div`
  width: 300px; /* Fixed width for the right panel */
  min-width: 200px; /* Minimum width */
  border-left: 1px solid #ddd;
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px); /* Match the height of EmailListContainer */
`;

const QuickSettingsContent = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* This is important for flex children to be scrollable */
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

  const inboxTypes = [
    {
      value: "default",
      label: "Default",
      imgSrc: "/assets/images/Classic.png",
      handleCustomize: () => {
        console.log("customize");
      },
    },
    {
      value: "important-first",
      label: "Important first",
      imgSrc: "/assets/images/Importantfirst.png",
    },
    {
      value: "unread-first",
      label: "Unread first",
      imgSrc: "/assets/images/Unreadfirst.png",
    },
    {
      value: "starred-first",
      label: "Starred first",
      imgSrc: "/assets/images/Starredfirst.png",
    },
    {
      value: "priority-inbox",
      label: "Priority Inbox",
      imgSrc: "/assets/images/Priorityinbox.png",
      handleCustomize: () => {
        console.log("priority inbox");
      },
    },
    {
      value: "multiple-inboxes",
      label: "Multiple Inboxes",
      imgSrc: "/assets/images/MultipleInboxes.png",
      handleCustomize: () => {
        console.log("multiple inboxes");
      },
    },
  ];

  const readingPanes = [
    {
      value: "no-split",
      label: "No split",
      imgSrc: "/assets/images/Previewpaneoff.png",
    },
    {
      value: "right-of-inbox",
      label: "Right of inbox",
      imgSrc: "/assets/images/Previewpaneright.png",
    },
    {
      value: "below-inbox",
      label: "Below inbox",
      imgSrc: "/assets/images/Previewpanebottom.png",
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
        <Apps />
        <RadioSection title="Density" defaultValue="default" items={densities} />
        <Themes />
        <RadioSection title="Inbox type" defaultValue="default" items={inboxTypes} />
        <RadioSection title="Reading pane" defaultValue="default" items={readingPanes} />
        <Threading />
      </QuickSettingsContent>
    </Container>
  );
};

export default QuickSettings;
