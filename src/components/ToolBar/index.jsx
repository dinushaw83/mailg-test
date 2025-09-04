import Pagination from "./Pagination";

const ToolBar = () => {
  return (
    <div className="D E G-atb" gh="tm">
      <div className="G6" role="toolbar" aria-label="search refinement">
        <div className="YhbRke sf-hidden" />
      </div>
      <div className="nH aqK">
        <div className="Cq aqL" gh="mtb">
          <div className="bzn" jslog="202616; u014N:xr6bB">
            <div className="G-tF">
              <div className="G-Ni J-J5-Ji">
                <div
                  id=":2u"
                  className="T-I J-J5-Ji T-Pm T-I-ax7 L3 J-JN-M-I"
                  role="button"
                  tabIndex={0}
                  aria-haspopup="true"
                  aria-expanded="false"
                  data-tooltip="Select"
                  aria-label="Select"
                  style={{ userSelect: "none" }}
                >
                  <div className="J-J5-Ji J-JN-M-I-Jm">
                    <span
                      className="T-Jo J-J5-Ji"
                      jslog="170807; u014N:cOuCgd,Kr2w4b;"
                      aria-checked="false"
                      role="checkbox"
                      dir="ltr"
                      style={{ userSelect: "none" }}
                    >
                      <div className="T-Jo-auh sf-hidden" role="presentation" />
                    </span>
                    <div className="G-asx T-I-J3 J-J5-Ji" aria-hidden="true">
                      &nbsp;
                    </div>
                  </div>
                  <div className="J-J5-Ji J-JN-M-I-JG sf-hidden" aria-hidden="true">
                    &nbsp;
                  </div>
                </div>
              </div>
              <div className="G-Ni G-aE J-J5-Ji" style={{ display: "none" }} />
              <div className="G-Ni J-J5-Ji" style={{ display: "none" }} />
              <div className="G-Ni J-J5-Ji">
                <div
                  className="T-I J-J5-Ji nu T-I-ax7 L3"
                  act={20}
                  role="button"
                  tabIndex={0}
                  jslog="110081; u014N:xr6bB,cOuCgd,Kr2w4b"
                  data-tooltip="Refresh"
                  aria-label="Refresh"
                  style={{ userSelect: "none" }}
                >
                  <div className="asa">
                    <div className="asf T-I-J3 J-J5-Ji" />
                  </div>
                </div>
              </div>
              <div className="J-J5-Ji">
                <div className="T9" style={{ display: "none" }}>
                  Fetching mail...
                </div>
              </div>
              <div className="G-Ni J-J5-Ji">
                <div
                  id=":2w"
                  className="T-I J-J5-Ji nf T-I-ax7 L3"
                  role="button"
                  tabIndex={0}
                  aria-label="More email options"
                  aria-haspopup="false"
                  aria-expanded="false"
                  data-tooltip="More"
                  style={{ userSelect: "none" }}
                >
                  <div className="asa">
                    <div className="bjy T-I-J3 J-J5-Ji" />
                  </div>
                  <div className="G-asx T-I-J3 J-J5-Ji sf-hidden">&nbsp;</div>
                </div>
              </div>
              <div
                className="J-M jQjAxd"
                role="menu"
                aria-haspopup="true"
                style={{
                  display: "none",
                  userSelect: "none",
                }}
              />
            </div>
          </div>
        </div>
        <div className="Cr aqJ">
          <div className="ar5 J-J5-Ji">
            <Pagination />
          </div>
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
        <div className="dJ" />
      </div>
      <div className="LQDzGc" />
      <div className="ciwp4" style={{ display: "none" }} />
      <div className="r0yTaf" />
    </div>
  );
};

export default ToolBar;
