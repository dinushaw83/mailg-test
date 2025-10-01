import {
    SettingsRow, SettingsCell,
    BoldLabel, LearnMoreLink, SettingsRadio, 
} from "./styles";

export default function ButtonLabelsRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left">
                <BoldLabel>Button labels:</BoldLabel>
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
                    <SettingsRadio
                        type="radio"
                        name="buttonLabels"
                        value="icons"
                        defaultChecked
                    />{" "}
                    <BoldLabel>Icons</BoldLabel>
                </label>
                <br />
                <label>
                    <SettingsRadio type="radio" name="buttonLabels" value="text" />{" "}
                    <BoldLabel>Text</BoldLabel>
                </label>
            </SettingsCell>
        </SettingsRow>
    );
}