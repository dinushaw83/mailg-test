import { SettingsRow, SettingsCell, BoldLabel, LearnMoreLink } from "./styles";
import { generateAvatarColor } from "../../../utils/helperFunctions";
import { useGlobalContext } from "../../../contexts/GlobalContext";

export default function MyPictureRow() {
  const { loggedInUser } = useGlobalContext();

  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel>My picture:</BoldLabel>
        <br />
        <LearnMoreLink href="#" target="_blank">
          Learn more
        </LearnMoreLink>
      </SettingsCell>
      <SettingsCell side="right">
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="gb_z gb_td gb_Pf gb_0">
            <div className="gb_D gb_qb gb_Pf gb_0">
              <a
                className="gb_B gb_Za gb_0"
                aria-expanded="false"
                aria-label="Google Account: "
                href="#"
                tabIndex={0}
                role="button"
                style={{
                  backgroundColor: generateAvatarColor(loggedInUser.name),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                }}
              >
                <span className="gb_ae" style={{ fontSize: "15px", color: "white" }}>
                  J
                </span>
              </a>
            </div>
          </div>
          <div style={{ display: "flex", paddingLeft: "20px" }}>
            <div>
              <div>Your Google profile picture is visible across Google services.</div>
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
