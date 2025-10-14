import { useState } from "react";
import {
    SettingsRow, SettingsCell,
    BoldLabel, InlineSelect
} from "./styles";

export default function PageSizeRow() {
    const [pageSize, setPageSize] = useState("50");

    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Maximum page size:</BoldLabel>
            </SettingsCell>
            <SettingsCell side="right">
                <div style={{ fontWeight: "bold", overflowWrap: "break-word" }}>
                    Show{" "}
                    <InlineSelect defaultValue="50"
                        value={pageSize}
                        onChange={(e) => {
                            // TODO: update state or save setting
                        }}>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </InlineSelect>{" "}
                    conversations per page
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
