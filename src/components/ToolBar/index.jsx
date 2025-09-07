import Pagination from "./Pagination";

import MailActions from "../MailActions";

const ToolBar = ({ totalFilteredItems }) => {
  return (
    <div className="D E G-atb" gh="tm">
      <div className="G6" role="toolbar" aria-label="search refinement">
        <div className="YhbRke sf-hidden" />
      </div>
      <div className="nH aqK">
        <div className="Cq aqL" gh="mtb">
          <MailActions />
        </div>
        <div className="Cr aqJ">
          <div className="ar5 J-J5-Ji">
            <Pagination totalFilteredItems={totalFilteredItems} />
          </div>

          {/* Toggle split pane mode button */}
          <div className="G-Ni J-J5-Ji" jslog="177396; u014N:cOuCgd,Kr2w4b,xr6bB;">
            <div
              id=":1w"
              className="T-I J-J5-Ji apF T-I-Js-IF T-I-ax7 L3"
              role="button"
              tabIndex={0}
              data-tooltip="Toggle split pane mode"
              aria-label="Toggle split pane mode"
              style={{ userSelect: "none" }}
            >
              <div className="asa">
                <div className="apH T-I-J3 J-J5-Ji apK" />
              </div>
            </div>
            <div
              id=":1y"
              className="T-I J-J5-Ji T-I-Js-Gs apG T-I-ax7 L3"
              role="button"
              tabIndex={0}
              aria-expanded="false"
              aria-haspopup="true"
              style={{ userSelect: "none" }}
            >
              <div className="G-asx J-J5-Ji" />
            </div>
          </div>
          <div
            className="J-M apL jQjAxd"
            role="menu"
            aria-haspopup="true"
            style={{
              display: "none",
              userSelect: "none",
            }}
          />
        </div>
        {/* <div className="dJ" /> */}
      </div>
      {/* <div className="LQDzGc" /> */}
      {/* <div className="ciwp4" style={{ display: "none" }} /> */}
      {/* <div className="r0yTaf" /> */}
    </div>
  );
};

export default ToolBar;
