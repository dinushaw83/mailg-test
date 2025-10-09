import React from "react";
import {
    SettingsRow,
    SettingsCell,
    BoldLabel,
    StyledLink,
} from "./styles";

export function DynamicEmailRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Dynamic email:</BoldLabel>
                <br />
                <StyledLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </StyledLink>
            </SettingsCell>

            <SettingsCell side="right">
                <label>
                    <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} checked={true} onClick={(e) => e.preventDefault()} />
                    <BoldLabel style={{ marginLeft: "6px" }}>Enable dynamic email</BoldLabel> – Display dynamic email content
                    when available.
                    <div style={{ marginTop: "4px" }}>
                        <StyledLink href="#">
                            Developer settings
                        </StyledLink>
                    </div>
                </label>
            </SettingsCell>
        </SettingsRow>
    );
}
