import React from "react";
import { useNavigate } from "react-router-dom";

const LeftSidebar = () => {
  const navigate = useNavigate();

  const composeEmail = () => {
    // Push compose=new parameter to the url
    navigate("?compose=new");
  }

  return (
    <div
      className="aeN WR baA nH oy8Mbf"
      role="navigation"
      jslog="88024; u014N:xr6bB;"
      style={{ width: 187, height: 1001 }}
    >
      <div className="aic" onClick={composeEmail}>
        <div className="z0">
          <div
            className="T-I T-I-KE L3"
            style={{ userSelect: "none" }}
            role="button"
            tabIndex={0}
            jscontroller="eIu7Db"
            jsaction="click:dlrqf; clickmod:dlrqf"
            jslog="20510; u014N:cOuCgd,Kr2w4b"
            gh="cm"
          >
            Compose
          </div>
        </div>
      </div>
      <div className="V3 aam">
        <div className="at9">
          <div className="Ls77Lb aZ6">
            <div
              jscontroller="DUNnfe"
              className="pp"
              style={{ userSelect: "none" }}
            >
              <div id=":n8">
                <div className="nM">
                  <div id=":mz" className="aic" />
                  <div className="yJ">
                    <div className="ajl aib aZ6" aria-labelledby=":nk">
                      <h2 className="aWk" id=":nk">
                        Labels
                      </h2>
                      <div className="wT">
                        <div id=":n9" className="n3">
                          <div className="byl">
                            <div className="TK">
                              <div className="aim ain">
                                <div
                                  className="TO aBP nZ aiq"
                                  id=":nn"
                                  data-tooltip="Inbox"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:WzZd"
                                >
                                  <div
                                    className="TN bzz aHS-bnt"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <span
                                      style={{
                                        alignItems: "center",
                                        display: "flex",
                                        flexShrink: "0",
                                        fontSize: "20px",
                                        justifyContent: "flex-start",
                                        marginRight: "18px",
                                      }}
                                      className="material-symbols-filled"
                                    >
                                      inbox
                                    </span>
                                    <div className="aio UKr6le">
                                      <span className="nU n1">
                                        <a
                                          href="#"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="Inbox 2 unread"
                                          tabIndex={0}
                                          draggable="false"
                                        >
                                          Inbox
                                        </a>
                                      </span>
                                      <div className="bsU">2</div>
                                    </div>
                                    <div className="nL aif" />
                                  </div>
                                </div>
                              </div>
                              <div className="aim">
                                <div
                                  className="TO"
                                  id=":no"
                                  data-tooltip="Starred"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:WzE1XQ.."
                                >
                                  <div
                                    className="TN bzz aHS-bnw"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <span
                                      style={{
                                        alignItems: "center",
                                        display: "flex",
                                        flexShrink: "0",
                                        fontSize: "20px",
                                        justifyContent: "flex-start",
                                        marginRight: "18px",
                                        opacity: "0.71",
                                      }}
                                      className="material-symbols-outlined"
                                    >
                                      star
                                    </span>
                                    <div className="aio UKr6le">
                                      <span className="nU">
                                        <a
                                          href="#"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="Starred"
                                          tabIndex={-1}
                                          draggable="false"
                                        >
                                          Starred
                                        </a>
                                      </span>
                                    </div>
                                    <div className="nL aif" />
                                  </div>
                                </div>
                              </div>
                              <div className="aim">
                                <div
                                  className="TO"
                                  id=":np"
                                  data-tooltip="Snoozed"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:WzEzXQ.."
                                >
                                  <div
                                    className="TN bzz aHS-bu1"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <span
                                      style={{
                                        alignItems: "center",
                                        display: "flex",
                                        flexShrink: "0",
                                        fontSize: "20px",
                                        justifyContent: "flex-start",
                                        marginRight: "18px",
                                        opacity: "0.71",
                                      }}
                                      className="material-symbols-outlined"
                                    >
                                      schedule
                                    </span>
                                    <div className="aio UKr6le">
                                      <span className="nU">
                                        <a
                                          href="#"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="Snoozed"
                                          tabIndex={-1}
                                          draggable="false"
                                        >
                                          Snoozed
                                        </a>
                                      </span>
                                    </div>
                                    <div className="nL aif" />
                                  </div>
                                </div>
                              </div>
                              <div className="aim">
                                <div
                                  className="TO"
                                  id=":ns"
                                  data-tooltip="Sent"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:Wzdd"
                                >
                                  <div
                                    className="TN bzz aHS-bnu"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <span
                                      style={{
                                        alignItems: "center",
                                        display: "flex",
                                        flexShrink: "0",
                                        fontSize: "20px",
                                        justifyContent: "flex-start",
                                        marginRight: "18px",
                                        opacity: "0.71",
                                      }}
                                      className="material-symbols-outlined"
                                    >
                                      send
                                    </span>
                                    <div className="aio UKr6le">
                                      <span className="nU">
                                        <a
                                          href="#"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="Sent"
                                          tabIndex={-1}
                                          draggable="false"
                                        >
                                          Sent
                                        </a>
                                      </span>
                                    </div>
                                    <div className="nL aif" />
                                  </div>
                                </div>
                              </div>
                              <div className="aim">
                                <div
                                  className="TO"
                                  id=":nu"
                                  data-tooltip="Drafts"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:Wzhd"
                                >
                                  <div
                                    className="TN bzz aHS-bnq"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <span
                                      style={{
                                        alignItems: "center",
                                        display: "flex",
                                        flexShrink: "0",
                                        fontSize: "20px",
                                        justifyContent: "flex-start",
                                        marginRight: "18px",
                                        opacity: "0.71",
                                      }}
                                      className="material-symbols-outlined"
                                    >
                                      draft
                                    </span>
                                    <div className="aio UKr6le">
                                      <span className="nU">
                                        <a
                                          href="#"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="Drafts"
                                          tabIndex={-1}
                                          draggable="false"
                                        >
                                          Drafts
                                        </a>
                                      </span>
                                    </div>
                                    <div className="nL aif" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="byl aJZ a0L TA sf-hidden" />
                        </div>
                        <div className="n6">
                          <span
                            role="button"
                            className="J-Ke n4 ah9"
                            id=":ng"
                            gh="mll"
                            aria-label="More labels"
                            tabIndex={0}
                          >
                            <span className="CJ">More</span>
                            <span className="ait">
                              <div className="G-asx J-J5-Ji">&nbsp;</div>
                            </span>
                          </span>
                        </div>
                        <div id=":n1" style={{ display: "none" }} />
                      </div>
                    </div>
                  </div>
                  <div className="aAw FgKVne">
                    <span className="aAv" role="heading">
                      Labels
                    </span>
                    <div
                      className="aAu arN"
                      jsname="dlrqf"
                      aria-label="Create new label"
                      data-tooltip="Create new label"
                      role="button"
                      tabIndex={0}
                      type="button"
                      jslog="167296; u014N:cOuCgd,Kr2w4b,xr6bB;"
                    />
                  </div>
                  <div className="yJ">
                    <div className="ajl aib aZ6" aria-labelledby=":nl">
                      <h2 className="aWk" id=":nl">
                        Labels
                      </h2>
                      <div className="wT">
                        <div id=":na" className="n3">
                          <div className="zw" gh="cl">
                            <div className="TK">
                              <div className="aim">
                                <div
                                  className="TO"
                                  id=":o3"
                                  data-tooltip="[Imap]/Drafts"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:WzBd"
                                >
                                  <div
                                    className="TN aY7xie aEc aHS-bnr"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <div className="TH J-J5-Ji" />
                                    <div className="qj aEe qr" />
                                    <div className="aio aip">
                                      <span className="nU">
                                        <a
                                          href="#label/%5BImap%5D/Drafts"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="[Imap]/Drafts has menu"
                                          tabIndex={-1}
                                          draggable="false"
                                        >
                                          [Imap]/Drafts
                                        </a>
                                      </span>
                                    </div>
                                    <div className="nL aig">
                                      <div
                                        className="pM aj0 sf-hidden"
                                        style={{
                                          color: "",
                                          backgroundColor: "",
                                          borderColor: "",
                                        }}
                                        jsaction="ZElhof"
                                        data-label-name="[Imap]/Drafts"
                                        tabIndex={0}
                                        aria-haspopup="true"
                                        aria-hidden="true"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="aim">
                                <div
                                  className="TO"
                                  id=":o4"
                                  data-tooltip="[Imap]/Sent"
                                  data-tooltip-align="r"
                                  jslog="36893; u014N:cOuCgd; 14:WzBd"
                                >
                                  <div
                                    className="TN aY7xie aEc aHS-bnr"
                                    style={{ marginLeft: 0 }}
                                  >
                                    <div className="TH J-J5-Ji" />
                                    <div className="qj aEe qr" />
                                    <div className="aio aip">
                                      <span className="nU">
                                        <a
                                          href="#label/%5BImap%5D/Sent"
                                          target="_top"
                                          className="J-Ke n0"
                                          aria-label="[Imap]/Sent has menu"
                                          tabIndex={-1}
                                          draggable="false"
                                        >
                                          [Imap]/Sent
                                        </a>
                                      </span>
                                    </div>
                                    <div className="nL aig">
                                      <div
                                        className="pM aj0 sf-hidden"
                                        style={{
                                          color: "",
                                          backgroundColor: "",
                                          borderColor: "",
                                        }}
                                        jsaction="ZElhof"
                                        data-label-name="[Imap]/Sent"
                                        tabIndex={0}
                                        aria-haspopup="true"
                                        aria-hidden="true"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="n6" style={{ display: "none" }} />
                        <div id=":n2" style={{ display: "none" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="I6agWe">
        <div className="Od0X9">
          <div
            jscontroller="YbzfXd"
            jsaction="rcuQ6b:npT2md"
            data-rp-onramp-input={357}
            data-button-classes="M1LkOe"
            data-icon-classes="kaUFz"
            data-img-classes="E00Cxb"
            className="pt0Pr"
          >
            <div jsname="z1ikhe" />
          </div>
        </div>
      </span>
    </div>
  );
};

export default LeftSidebar;
