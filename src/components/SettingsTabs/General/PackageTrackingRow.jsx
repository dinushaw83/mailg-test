import {
    SettingsRow, SettingsCell,
    BoldLabel, LearnMoreLink, SettingsCheckbox, 
} from "./styles";

export default function PackageTrackingRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left">
                <BoldLabel>Package tracking:</BoldLabel>
                <br />
                <LearnMoreLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </LearnMoreLink>
            </SettingsCell>
            <SettingsCell side="right">
                <label>
                    <SettingsCheckbox type="checkbox" />{" "}
                    <strong>Turn on package tracking - </strong>
                    Google will share parcel tracking numbers with delivery companies. You’ll get
                    status updates in Gmail.
                </label>
            </SettingsCell>
        </SettingsRow>
    );
}
