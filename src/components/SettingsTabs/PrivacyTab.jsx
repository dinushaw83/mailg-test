import React from "react";
import { Box, Typography, FormGroup, FormControlLabel, Switch, Divider, Link, Button } from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import PrivacyHub from "./PrivacyHub";

const PrivacyTab = () => {
  const { privacySettings, setPrivacySettings } = useGlobalContext();
  const [openHub, setOpenHub] = React.useState(false);

  const handleToggle = (key) => (event) => {
    setPrivacySettings({ [key]: event.target.checked });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Privacy
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Control how this app collects and uses your data. Changes apply only on this device.
      </Typography>

      <Button
        variant="outlined"
        onClick={() => setOpenHub(true)}
        sx={{ textTransform: 'none', borderRadius: 10, mb: 2 }}
      >
        Open Privacy & Data Controls
      </Button>

      <FormGroup>
        <FormControlLabel
          control={<Switch checked={!!privacySettings.analyticsEnabled} onChange={handleToggle("analyticsEnabled")} />}
          label="Allow anonymous analytics"
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 6, mt: -1, mb: 1 }}>
          Help improve the app by sending usage statistics. No personal content is collected.
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <FormControlLabel
          control={<Switch checked={!!privacySettings.crashReportsEnabled} onChange={handleToggle("crashReportsEnabled")} />}
          label="Send crash reports"
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 6, mt: -1, mb: 1 }}>
          Automatically send error reports when the app crashes. May include system info.
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <FormControlLabel
          control={<Switch checked={!!privacySettings.personalizationEnabled} onChange={handleToggle("personalizationEnabled")} />}
          label="Use data for personalization"
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 6, mt: -1, mb: 1 }}>
          Enable features like smart suggestions based on your usage.
        </Typography>
      </FormGroup>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Learn more in our <Link href="#" underline="hover">Privacy Policy</Link>.
      </Typography>

      <PrivacyHub open={openHub} onClose={() => setOpenHub(false)} />
    </Box>
  );
};

export default PrivacyTab;


