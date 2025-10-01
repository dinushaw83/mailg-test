import {
    SettingsRow, SettingsCell,
    BoldLabel, LearnMoreLink, 
} from "./styles";

export default function MyPictureRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left">
                <BoldLabel>My picture:</BoldLabel>
                <br />
                <LearnMoreLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </LearnMoreLink>
            </SettingsCell>
            <SettingsCell side="right">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <img
                        alt="Profile"
                        src="#"
                        style={{
                            border: "2px solid white",
                            borderRadius: "50%",
                            backgroundColor: "rgba(255,255,255,0.95)",
                            height: "52px",
                            width: "52px",
                        }}
                    />
                    <div style={{ display: "flex", paddingLeft: "20px" }}>
                        <div>
                            <div>
                                Your Google profile picture is visible across Google services.
                            </div>
                            <div>
                                You can change your picture in{" "}
                                <a
                                    href="#"
                                    style={{
                                        whiteSpace: "nowrap",
                                        cursor: "pointer",
                                        textDecoration: "none",
                                        color: "rgb(17, 85, 204)",
                                    }}
                                >
                                    About me
                                </a>
                                .
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}