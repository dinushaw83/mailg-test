import React from "react";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import styled from "@emotion/styled";

import { useGlobalContext } from "../contexts/GlobalContext";

const ContentContainer = styled.div`
  background-color: transparent;
  position: relative;
  display: flex;
`;

const Layout = ({ children }) => {
  const { isLeftSidebarExpanded, rightSidebarExpanded, rightSidebarActiveTab } = useGlobalContext();

  // Calculate the empty div width when left sidebar is collapsed
  const calculateEmptyDivWidth = () => {
    if (!isLeftSidebarExpanded) {
      if (rightSidebarExpanded && rightSidebarActiveTab.activeTab) {
        return "114px";
      } else if (rightSidebarExpanded && !rightSidebarActiveTab.activeTab) {
        return "92px";
      } else {
        return "90px";
      }
    } else {
      return 0;
    }
  };

  return (
    <div className="tVu25">
      <div tabIndex={0} />
      <div className="nH">
        <div className="nH" style={{ position: "relative" }}>
          <Header />
          <ContentContainer id="content-container">
            <LeftSidebar />
            {!isLeftSidebarExpanded && <div style={{ width: calculateEmptyDivWidth() }} />}
            {children}
            <RightSidebar />
          </ContentContainer>
        </div>
      </div>
    </div>
  );
};

export default Layout;
