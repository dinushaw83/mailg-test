import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import ContactsTab from "./ContactsTab";

const TabPanel = ({ children, value, tabName, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== tabName}
      id={`vertical-tabpanel-${tabName}`}
      aria-labelledby={`vertical-tab-${tabName}`}
      {...other}
    >
      {value === tabName && (
        <Box sx={{ py: 2, px: 0.5, height: "100%" }}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
};

const RightSideBarTabs = ({ activeTab, isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Tab content area */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <TabPanel value={activeTab} tabName="CONTACTS">
          <ContactsTab onClose={onClose} />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default RightSideBarTabs;