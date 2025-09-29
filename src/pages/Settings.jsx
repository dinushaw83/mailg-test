import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container,
} from "@mui/material";

const Settings = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  
  // Define the available tabs
  const tabs = [
    { id: "general", label: "General" },
    { id: "labels", label: "Labels" },
    { id: "inbox", label: "Inbox" },
    { id: "accounts", label: "Accounts and Import" },
    { id: "filters", label: "Filters and Blocked Addresses" },
    { id: "forwarding", label: "Forwarding and POP/IMAP" },
    { id: "addons", label: "Add-ons" },
    { id: "chat", label: "Chat and Meet" },
    { id: "advanced", label: "Advanced" },
    { id: "offline", label: "Offline" },
    { id: "themes", label: "Themes" },
  ];

  // Find the current tab index, default to "general" if not found
  const currentTabIndex = tabs.findIndex(t => t.id === tab) || 0;

  const handleTabChange = (event, newValue) => {
    const selectedTab = tabs[newValue];
    navigate(`/settings/${selectedTab.id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper elevation={0} sx={{ backgroundColor: "transparent" }}>
        {/* Settings Title */}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 400,
            color: "#202124",
            marginBottom: 3,
            fontSize: "1.375rem",
          }}
        >
          Settings
        </Typography>

        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: 0 }}>
          <Tabs
            value={currentTabIndex}
            onChange={handleTabChange}
            variant="standard"
            scrollButtons="auto"
            sx={{
              "&.MuiTabs-root": {
                minHeight: 24,
                height: "max-content",
                display: "flex",
                flexWrap: "wrap"
              },
              "& .MuiButtonBase-root": {
                
              },
              "& .MuiTabs-list": {
                flexWrap: "wrap",
                rowGap: 2,
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "0.875rem",
                fontWeight: 400,
                color: "#5f6368",
                minHeight: 24,
                padding: "0 8px 6px",
                flexGrow: 0,
                flexShrink: 1,
                flexBasis: "auto",
                minWidth: "max-content",
                "&.Mui-selected": {
                  color: "#1a73e8",
                  fontWeight: 500,
                  borderBottom: "3px solid #1a73e8"
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#1a73e8",
                display: "none"
              },
            }}
          >
            {tabs.map((tabItem) => (
              <Tab
                key={tabItem.id}
                label={tabItem.label}
                id={`settings-tab-${tabItem.id}`}
                aria-controls={`settings-tabpanel-${tabItem.id}`}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ minHeight: 400 }}>
          {tabs.map((tabItem, index) => (
            <div
              key={tabItem.id}
              role="tabpanel"
              hidden={currentTabIndex !== index}
              id={`settings-tabpanel-${tabItem.id}`}
              aria-labelledby={`settings-tab-${tabItem.id}`}
            >
              {currentTabIndex === index && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
                    {tabItem.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tabItem.label} settings content will be displayed here.
                  </Typography>
                </Box>
              )}
            </div>
          ))}
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
