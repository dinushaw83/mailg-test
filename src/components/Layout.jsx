import React from "react";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import { useGlobalContext } from "../contexts/GlobalContext";

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
          <div className="nH aqk aql bkL">
            <LeftSidebar />
            {!isLeftSidebarExpanded && <div style={{ width: calculateEmptyDivWidth() }} />}
            {children}
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
