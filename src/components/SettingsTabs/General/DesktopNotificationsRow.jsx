import {
    SettingsRow, SettingsCell,
    BoldLabel, SubText, LearnMoreLink, SettingsRadio, 
} from "./styles";

export default function DesktopNotificationsRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left">
                <BoldLabel style={{ marginLeft: "6px" }}>Desktop notifications:</BoldLabel>
                <br />
                <SubText>
                    (Allows Gmail to display pop-up notifications on your desktop when new emails
                    arrive)
                </SubText>
                <br />
                <LearnMoreLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </LearnMoreLink>
            </SettingsCell>
            <SettingsCell side="right">
                <LearnMoreLink as="span">Click here to enable desktop notifications</LearnMoreLink>
                <br />
                <label>
                    <SettingsRadio type="radio" name="notifications" value="all" checked={false} onClick={(e) => e.preventDefault()} />
                    <BoldLabel style={{ marginLeft: "6px" }}>New mail notifications on</BoldLabel> – notify on any new mail
                </label>
                <br />
                <label>
                    <SettingsRadio type="radio" name="notifications" value="important" checked={false} onClick={(e) => e.preventDefault()} />
                    <BoldLabel style={{ marginLeft: "6px" }}>Important mail notifications on</BoldLabel> – only notify on
                    important mail
                </label>
                <br />
                <label>
                    <SettingsRadio type="radio" name="notifications" value="off" defaultChecked checked={true} onClick={(e) => e.preventDefault()} />
                    <BoldLabel style={{ marginLeft: "6px" }}>Mail notifications off</BoldLabel>
                </label>
            </SettingsCell>
        </SettingsRow>
    );
}