import React, { useEffect } from "react";
import {
    SettingsRow, SettingsCell,
    BoldLabel, SubText, LearnMoreLink, SettingsRadio, 
} from "./styles";
import { notificationManager, getNotificationPermission } from "../../../utils/notifications";
import { useNotificationContext } from "../../../contexts/NotificationContext";

export default function DesktopNotificationsRow() {
    const {
        notificationSettings,
        updateNotificationSettings,
        permissionStatus,
        updatePermissionStatus,
        showDemoNotification
    } = useNotificationContext() || {};

    // Safety check
    if (!notificationSettings || !updateNotificationSettings) {
        return (
            <SettingsRow>
                <SettingsCell side="left" width="20%">
                    <BoldLabel style={{ marginLeft: "6px" }}>Desktop notifications:</BoldLabel>
                    <br />
                    <SubText>Loading...</SubText>
                </SettingsCell>
                <SettingsCell side="right">
                    <span>Notification context not available</span>
                </SettingsCell>
            </SettingsRow>
        );
    }

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
        <SettingsRow>
            <SettingsCell side="left" width="20%">
                <BoldLabel style={{ marginLeft: "6px" }}>Desktop notifications:</BoldLabel>
                <br />
                <SubText>
                    (allows MailG to display popup notifications on your desktop when new email messages arrive)
                </SubText>
                <br />
                <LearnMoreLink
                    href="#"
                    onClick={handleLearnMoreClick}
                >
                    Learn more
                </LearnMoreLink>
            </SettingsCell>
            <SettingsCell side="right">
                <label style={{ display: "block", marginBottom: "8px" }}>
                    <SettingsRadio 
                        type="radio" 
                        name="notifications" 
                        value="new" 
                        checked={notificationSettings.type === "new"} 
                        onChange={() => handleNotificationTypeChange("new")} 
                    />
                    <BoldLabel style={{ marginLeft: "6px" }}>New mail notifications on</BoldLabel> – Notify me when any new message arrives in my inbox or primary tab
                </label>
                <label style={{ display: "block", marginBottom: "8px" }}>
                    <SettingsRadio 
                        type="radio" 
                        name="notifications" 
                        value="important" 
                        checked={notificationSettings.type === "important"} 
                        onChange={() => handleNotificationTypeChange("important")} 
                    />
                    <BoldLabel style={{ marginLeft: "6px" }}>Important mail notifications on</BoldLabel> – Notify me only when an important message arrives in my inbox
                </label>
                <label style={{ display: "block", marginBottom: "8px" }}>
                    <SettingsRadio 
                        type="radio" 
                        name="notifications" 
                        value="off" 
                        checked={notificationSettings.type === "off"} 
                        onChange={() => handleNotificationTypeChange("off")} 
                    />
                    <BoldLabel style={{ marginLeft: "6px" }}>Mail notifications off</BoldLabel>
                </label>
                
                {/* CONDITIONAL: Mail notification sounds select dropdown */}
                {showSoundsDropdown && (
                    <div style={{ marginTop: "12px" }}>
                        <BoldLabel style={{ marginRight: "8px" }}>Mail notification sounds:</BoldLabel>
                        <select
                            value={notificationSettings.sound}
                            onChange={(e) => handleSoundChange(e.target.value)}
                            style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                fontSize: "14px",
                                fontWeight: "normal",
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
                    </div>
                )}
            </SettingsCell>
        </SettingsRow>
    );
}