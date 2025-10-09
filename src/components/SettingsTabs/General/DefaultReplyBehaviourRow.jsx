import {
    SettingsRow, SettingsCell,
    BoldLabel, StyledLink, SettingsRadio, 
} from "./styles";

export default function DefaultReplyBehaviourRow() {

    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Default reply behaviour:</BoldLabel>
                <br />
                <StyledLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </StyledLink>
            </SettingsCell>

            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsRadio type="radio" name="replyBehaviour" value="reply" checked={true} onClick={(e) => e.preventDefault()} />
                        <BoldLabel style={{ marginLeft: "6px" }}>Reply</BoldLabel>
                    </label>
                </div>
                <div style={{ marginTop: "4px" }}>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="replyBehaviour"
                            value="replyAll"
                            checked={false}
                            onClick={(e) => e.preventDefault()}
                        />
                        <BoldLabel style={{ marginLeft: "6px" }}>Reply all</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}