import React, { useEffect } from "react";
import { 
  Box, 
  Typography, 
  FormControl, 
  FormControlLabel, 
  Radio, 
  RadioGroup,
  Link
} from "@mui/material";
import { notificationManager, getNotificationPermission } from "../../utils/notifications";
import { useNotificationContext } from "../../contexts/NotificationContext";

export default function DesktopNotifications() {
  const {
    notificationSettings,
    updateNotificationSettings,
    permissionStatus,
    updatePermissionStatus,
    showDemoNotification
  } = useNotificationContext();

  // Update permission status when component mounts and when notification type changes
  useEffect(() => {
    const updatePermissions = () => {
      updatePermissionStatus(getNotificationPermission());
    };
    
    updatePermissions();
    
    // Listen for permission changes
    if ("Notification" in window) {
      const checkPermissions = setInterval(updatePermissions, 1000);
      return () => clearInterval(checkPermissions);
    }
  }, [notificationSettings.type, updatePermissionStatus]);

  const handleNotificationTypeChange = async (type) => {
    updateNotificationSettings({ 
      type, 
      enabled: type !== "off" 
    });
    
    // Request permission when enabling notifications
    if (type !== "off") {
      await notificationManager.requestPermission();
      updatePermissionStatus(getNotificationPermission());
    }
  };

  const handleSoundChange = (soundId) => {
    updateNotificationSettings({ sound: soundId });
    
    // Play a preview of the selected sound
    if (soundId !== "0") {
      notificationManager.playSound(soundId);
    }
  };

  const handleLearnMoreClick = async (e) => {
    e.preventDefault();
    
    // Show demo notification with current sound setting
    await showDemoNotification();
  };

  const showSoundsDropdown = notificationSettings.type === "new" || notificationSettings.type === "important";

  return (
    <Box sx={{ marginBottom: 4 }}>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 3 }}>
        {/* Left Column - Text Content */}
        <Box sx={{ display: "flex", flexDirection: "column", width: "25%" }}>
          <Typography variant="body1" sx={{ color: "#202124", fontSize: "14px", fontWeight: "bold", marginBottom: 1 }}>
            Desktop notifications:
          </Typography>
          
          <Typography variant="body2" sx={{ 
            marginBottom: 1, 
            fontSize: "13px", 
            color: "#5f6368",
            lineHeight: 1.4
          }}>
            (allows MailG to display popup notifications on your desktop when new email messages arrive)
          </Typography>
          
          <Link 
            href="#" 
            onClick={handleLearnMoreClick}
            sx={{ 
              color: "#1a73e8", 
              textDecoration: "none",
              fontSize: "13px",
              "&:hover": { textDecoration: "underline" }
            }}
          >
            Learn more
          </Link>
        </Box>

        {/* Right Column - Radio Buttons and Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1, width: "75%" }}>
          <FormControl component="fieldset">
            <RadioGroup
              value={notificationSettings.type}
              onChange={(e) => handleNotificationTypeChange(e.target.value)}
            >
              <FormControlLabel 
                value="off" 
                control={<Radio size="small" sx={{ padding: "5px", paddingLeft: 0 }} />} 
                label={
                  <Typography variant="body2" sx={{ fontSize: "14px", fontWeight: "bold", color: "#202124" }}>
                    Mail notifications off
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
              <FormControlLabel 
                value="new" 
                control={<Radio size="small" sx={{ padding: "5px", paddingLeft: 0 }} />} 
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: "14px", fontWeight: "bold", color: "#202124", display: "inline" }}>
                      New mail notifications on
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "14px", color: "#202124", display: "inline" }}>
                      {" "}- Notify me when any new message arrives in my inbox or primary tab
                    </Typography>
                  </Box>
                }
                sx={{ margin: 0 }}
              />
              <FormControlLabel 
                value="important" 
                control={<Radio size="small" sx={{ padding: "5px", paddingLeft: 0 }} />} 
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: "14px", fontWeight: "bold", color: "#202124", display: "inline" }}>
                      Important mail notifications on
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "14px", color: "#202124", display: "inline" }}>
                      {" "}- Notify me only when an important message arrives in my inbox
                    </Typography>
                  </Box>
                }
                sx={{ margin: 0 }}
              />
            </RadioGroup>
          </FormControl>

          {/* CONDITIONAL: Mail notification sounds select dropdown */}
          {showSoundsDropdown && (
            <Box sx={{ marginTop: 2 }}>
              <Typography variant="body2" sx={{ 
                fontSize: "14px", 
                fontWeight: "bold",
                color: "#202124",
                display: "inline",
                marginRight: 1
              }}>
                Mail notification sounds:
              </Typography>
              <select
                value={notificationSettings.sound}
                onChange={(e) => handleSoundChange(e.target.value)}
                style={{
                  fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                  margin: "0px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  padding: "2px 4px",
                }}
              >
                <option value="0">None</option>
                <option value="1">Welcome</option>
                <option value="12">Nudge</option>
                <option value="10">Snappy</option>
                <option value="5">Sweet</option>
                <option value="8">Whistle</option>
                <option value="9">Tennis</option>
                <option value="4">Music box</option>
                <option value="3">Tones</option>
                <option value="7">Calm</option>
                <option value="6">Treasure</option>
                <option value="2">Piggyback</option>
                <option value="11">Shrink ray</option>
              </select>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

