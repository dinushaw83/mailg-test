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
    <StorageUsageContainer>
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

const TermsPrivacyProgramPolicies = () => {
  return (
    <div className="aeU">
      <div id=":2p">
        <div>
          <div className="ma">
            <a href="#" className="l9">
              Terms
            </a>
            ·{" "}
            <a href="#" className="l9">
              Privacy
            </a>
            ·{" "}
            <a href="#" className="l9">
              Program Policies
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const LastAccountActivity = () => {
  return (
    <div id=":2n" className="ae3">
      <div>
        <div className="l6">
          <div>Last account activity: 25 minutes ago</div>
          <span id=":o8" className="l8 LJOhwe" tabIndex={0} role="link">
            Details
          </span>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  return (
    <div className="l2 pfiaof V4" role="contentinfo">
      <StorageUsage />
      <TermsPrivacyProgramPolicies />
      <LastAccountActivity />
      <div style={{ clear: "both" }} />
    </div>
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
      }}
    >
      <StorageUsage centerText />
      <TermsPrivacyProgramPolicies />
      <LastAccountActivity />
    </Box>
  );
};

export default Footer;
