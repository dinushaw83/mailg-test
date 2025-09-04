import React, { useState, useRef} from "react"
import MoveToMenu from "./MoveToMenu"

const btnStyle = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 14,
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const LABELS = [
  { id: "check1", name: "✔" },
  { id: "check2", name: "✔✔" },
  { id: "gtb", name: "GTB" },
  { id: "notes", name: "Notes" },
  { id: "twilio", name: "Notes/Twilio" },
  { id: "personal", name: "Personal" },
  { id: "personal-kkk", name: "Personal/kkk" },
  { id: "personal-cx", name: "Personal/kkk/cx" },
  { id: "receipts", name: "Receipts" },
  { id: "work", name: "Work" },
  { id: "social", name: "Social" },
  { id: "updates", name: "Updates" },
  { id: "forums", name: "Forums" },
  { id: "promotions", name: "Promotions" },
];

export default function MailActions() {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);

    return (
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
                    <div
                      className="T-Jo-auh sf-hidden"
                      role="presentation"
                    />
                  </span>
                  <div
                    className="G-asx T-I-J3 J-J5-Ji"
                    aria-hidden="true"
                  >
                    &nbsp;
                  </div>
                </div>
                <div
                  className="J-J5-Ji J-JN-M-I-JG sf-hidden"
                  aria-hidden="true"
                >
                  &nbsp;
                </div>
              </div>
            </div>
            <div
              className="G-Ni G-aE J-J5-Ji"
              style={{ display: "none" }}
            />
            
            <div
              className="G-Ni J-J5-Ji"
              style={{ display: "none" }}
            />

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

            {/* Shows up when a mail is selected */}
            <React.Fragment>
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
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      archive
                    </span>
                  </div>
                </div>
              </div>

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
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      report
                    </span>
                  </div>
                </div>
              </div>

              <div className="G-Ni J-J5-Ji G-aE">
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
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      Delete
                    </span>
                  </div>
                </div>
              </div>

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
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      mail
                    </span>
                  </div>
                </div>
              </div>

              <div className="G-Ni J-J5-Ji">
                <div
                  className="T-I J-J5-Ji nu T-I-ax7 L3"
                  act={20}
                  role="button"
                  tabIndex={0}
                  jslog="110081; u014N:xr6bB,cOuCgd,Kr2w4b"
                  data-tooltip="Refresh"
                  aria-label="Refresh"
                  ref={anchorRef}
                  onClick={() => setOpen((s) => !s)}       // NEW: toggle menu
                  style={{ userSelect: "none", cursor: "pointer" }}
                >
                  <div className="asa">
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      drive_file_move
                    </span>
                  </div>
                </div>
              </div>

              {open && (                                   // NEW: render only when open
                <MoveToMenu
                  anchorRef={anchorRef}
                  labels={LABELS}
                  onSelect={(label) => {
                    console.log("Move to:", label);
                    setOpen(false);                        // close after select
                  }}
                  onClose={() => setOpen(false)}           // close on outside click / Esc
                />
              )}

            </React.Fragment>

            <div className="J-J5-Ji">
              <div
                className="T9"
                style={{ display: "none" }}
              >
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
              >
                <div className="asa">
                  <div className="bjy T-I-J3 J-J5-Ji" />
                </div>
                <div className="G-asx T-I-J3 J-J5-Ji sf-hidden">
                  &nbsp;
                </div>
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
    )
  }