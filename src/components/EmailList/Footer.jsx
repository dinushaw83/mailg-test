import styled from "@emotion/styled";
import Box from "@mui/material/Box";
import React from "react";

const StorageUsageContainer = styled.div`
  text-align: left;
  float: left;
`;

const ProgressBarContainer = styled.div`
  text-decoration: none;
  width: 220px;
`;

const ProgressBar = styled.div`
  background-color: rgb(218, 220, 224);
  border-radius: 8px;
  height: 6px;
  margin: 7px 0;
`;

const UsedStorage = styled.div`
  background-color: rgb(95, 99, 104);
  border-radius: 8px;
  height: 100%;
`;

const UsageAnnotationContainer = styled.div`
  align-items: center;
  display: flex;
  ${({ centerText }) => centerText && "justify-content: center;"}
`;

const UsageAnnotation = styled.div`
  font-size: 0.75rem;
  letter-spacing: normal;
  color: rgb(95, 99, 104);
  font-weight: normal;
  text-decoration: none;
  text-shadow: none;
`;

const StorageUsage = ({ width = "15%", centerText = false }) => {
  return (
    <StorageUsageContainer style={{ flex: 1 }}>
      <ProgressBarContainer>
        <a style={{ textDecoration: "none" }} href="#">
          <ProgressBar>
            <UsedStorage style={{ width }} />
          </ProgressBar>
          <UsageAnnotationContainer centerText={centerText}>
            <UsageAnnotation>
              <span dir="ltr">15%</span> of <span dir="ltr">15 GB</span> used
            </UsageAnnotation>
            <div className="aiz" role="img" aria-label="Follow link to manage storage" />
          </UsageAnnotationContainer>
        </a>
      </ProgressBarContainer>
    </StorageUsageContainer>
  );
};

const Dot = styled.div`
  width: 2px;
  height: 2px;
  background-color: #5e5e5e;
  border-radius: 50%;
`;

const TermsPrivacyProgramPolicies = ({ centerText = false }) => {
  return (
    <div
      className="aeU"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...(centerText && {
          width: "100%",
        }),
      }}
    >
      <div className="ma" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <a href="#" className="l9">
          Terms
        </a>
        <Dot />
        <a href="#" className="l9">
          Privacy
        </a>
        <Dot />
        <a href="#" className="l9">
          Program Policies
        </a>
      </div>
    </div>
  );
};

const LastAccountActivity = ({ centerText = false }) => {
  const style = centerText ? { width: "100%", display: "flex", alignItems: "center", justifyContent: "center" } : {};
  return (
    <div id=":2n" className="ae3" style={style}>
      <div className="l6">
        <div style={style}>Last account activity: 25 minutes ago</div>
        <span id=":o8" className="l8 LJOhwe" tabIndex={0} role="link" style={style}>
          Details
        </span>
      </div>
    </div>
  );
};

const FooterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Footer = () => {
  return (
    <FooterContainer>
      <StorageUsage />
      <TermsPrivacyProgramPolicies />
      <LastAccountActivity />
      <div style={{ clear: "both" }} />
    </FooterContainer>
  );
};

export const PanelFooter = () => {
  return (
    <Box
      role="contentinfo"
      sx={{
        marginTop: "3em",
        display: "flex",
        flexDirection: "column",
        gap: "1em",
        alignItems: "center",
        flex: 1,
      }}
    >
      <StorageUsage centerText />
      <LastAccountActivity centerText />
      <TermsPrivacyProgramPolicies centerText />
    </Box>
  );
};

export default Footer;
