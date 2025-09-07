import Box from "@mui/material/Box";
import { Icon } from "../InboxView/ActionBar";
import React from "react";
import Divider from "@mui/material/Divider";
import SpamActions from "../MailActions/SpamActions";

const BulkActions = ({ isSpam = false }) => {
  if (isSpam) {
    return <SpamActions />;
  }

  return (
    <Box display="flex" alignItems="center">
      <Icon name="archive" label="Archive" />
      <Icon name="report" label="Report" />
      <Icon name="delete" label="Delete" />

      <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

      <Icon name="mark_email_unread" label="Mark as unread" />
      {/* The next icon does not exactly match */}
      <Icon name="drive_file_move" label="Move to" />
    </Box>
  );
};

export default BulkActions;
