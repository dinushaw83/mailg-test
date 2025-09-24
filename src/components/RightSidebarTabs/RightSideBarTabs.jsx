import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import ContactsTab from "./ContactsTab/ContactsTab";
import { useGlobalContext } from '../../contexts/GlobalContext';

const TabPanel = ({ children, value, tabName, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== tabName}
      id={`vertical-tabpanel-${tabName}`}
      aria-labelledby={`vertical-tab-${tabName}`}
      {...other}
    >
      <Box sx={{ py: 2, px: 0.5, height: "100%" }}>
        <Typography component="div">{children}</Typography>
      </Box>
    </div>
  );
};

const RightSideBarTabs = () => {
  const { rightSidebarActiveTab } = useGlobalContext();

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Tab content area */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <TabPanel value={rightSidebarActiveTab.activeTab} tabName="contact">
          <ContactsTab />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default RightSideBarTabs;