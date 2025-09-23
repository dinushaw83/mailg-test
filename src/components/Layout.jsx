import React from "react";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import { useGlobalContext } from '../contexts/GlobalContext';

const Layout = ({ children }) => {
  const { isLeftSidebarExpanded } = useGlobalContext();

  return (
    <div className="tVu25">
      <div tabIndex={0} />
      <div className="nH">
        <div className="nH" style={{ position: "relative" }}>
          <Header />
          <div className="nH aqk aql bkL">
            <LeftSidebar />
            {!isLeftSidebarExpanded && <div style={{ width: "72px" }} />}
            {children}
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
