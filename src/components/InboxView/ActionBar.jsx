export const ActionBar = () => {
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
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="Cr aqJ">
          <div className="ar5 J-J5-Ji">
            <span className="Di">
              <div
                id=":mt"
                className="J-J5-Ji amH J-JN-I"
                role="button"
                aria-expanded="false"
                tabIndex={0}
                aria-haspopup="false"
                aria-label="Show more messages"
                style={{ userSelect: "none" }}
              >
                <span className="Dj">
                  <span>
                    <span className="ts">1</span>–<span className="ts">50</span>{" "}
                  </span>
                  of <span className="ts">6,917</span>
                </span>
              </div>
              <div
                id=":mv"
                className="T-I J-J5-Ji amD T-I-awG HeQuj T-I-ax7 T-I-Js-IF T-I-JE L3"
                role="button"
                jslog="126438; u014N:cOuCgd,Kr2w4b"
                aria-disabled="true"
                data-tooltip="Newer"
                aria-label="Newer"
                style={{ userSelect: "none" }}
              >
                <span className="amF sf-hidden" aria-hidden="true">
                  &nbsp;
                </span>
                <img
                  className="amI T-I-J3"
                  src="/assets/images/pr_2_image_1.gif"
                  alt=""
                />
              </div>
              <div
                id=":mw"
                className="T-I J-J5-Ji amD T-I-awG T-I-ax7 T-I-Js-Gs L3"
                role="button"
                tabIndex={0}
                jslog="126439; u014N:cOuCgd,Kr2w4b"
                data-tooltip="Older"
                aria-label="Older"
                style={{ userSelect: "none" }}
              >
                <span className="amF sf-hidden" aria-hidden="true">
                  &nbsp;
                </span>
                <img
                  className="amJ T-I-J3"
                  src="/assets/images/pr_2_image_1.gif"
                  alt=""
                />
              </div>
            </span>
          </div>
          <div
            className="G-Ni J-J5-Ji"
            jslog="177396; u014N:cOuCgd,Kr2w4b,xr6bB;"
          >
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
        </div>
      </div>
    </div>
  );
};

import styles from "./ActionBar.module.css";

const ActionItem = () => {
  return (
    <div className={styles.action_item_container}>
      <div
        className="T-I J-J5-Ji lR T-I-ax7 T-I-Js-Gs T-I-Js-IF mA"
        aria-label="Archive"
        role="button"
        tabIndex="0"
        style={{
          borderRadius: "2px",
          whiteSpace: "nowrap",
          fontSize: "0.875rem",
          fontWeight: 500,
          textAlign: "center",
          borderBottomLeftRadius: "0px",
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
          color: "rgb(68, 68, 68)",
          padding: "0px",
          WebkitUserDrag: "none",
          lineHeight: "18px",
          minWidth: "auto",
          outline: "none",
          background: "transparent",
          border: "none",
          margin: "0px",
          WebkitBoxAlign: "center",
          WebkitBoxPack: "center",
          position: "relative",
          zIndex: 0,
          alignItems: "center",
          backgroundImage: "initial",
          backgroundColor: "transparent",
          boxShadow: "none",
          height: "auto",
          justifyContent: "center",
          cursor: "pointer",
          display: "flex",
          marginLeft: "12px",
          marginRight: "12px",
          userSelect: "none",
        }}
      >
        <div
          className="asa"
          style={{
            border: "none",
            outline: "none",
            WebkitBoxAlign: "center",
            alignItems: "center",
            WebkitBoxPack: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 0,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <div
            className="ar8 T-I-J3 J-J5-Ji"
            style={{
              position: "relative",
              background:
                'url("https://ssl.gstatic.com/mail/sprites/general_black-2eb471de5e5ea7371fa18ebc5339694d.png") 0px -67px no-repeat',
              verticalAlign: "middle",
              opacity: 1,
              backgroundPosition: "center center",
              backgroundImage:
                'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/archive_baseline_nv700_20dp.png")',
              backgroundRepeat: "no-repeat",
              backgroundSize: "20px",
              margin: "0px",
              padding: "0px",
              transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "inline-block",
              height: "20px",
              marginTop: "0px",
              width: "20px",
            }}
          />
        </div>
      </div>
      <div
        className="T-I J-J5-Ji nN T-I-ax7 T-I-Js-Gs T-I-Js-IF mA"
        aria-label="Report spam"
        role="button"
        tabIndex="0"
        style={{
          borderRadius: "2px",
          whiteSpace: "nowrap",
          fontSize: "0.875rem",
          fontWeight: 500,
          textAlign: "center",
          borderBottomLeftRadius: "0px",
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
          color: "rgb(68, 68, 68)",
          padding: "0px",
          WebkitUserDrag: "none",
          lineHeight: "18px",
          minWidth: "auto",
          outline: "none",
          background: "transparent",
          border: "none",
          margin: "0px",
          WebkitBoxAlign: "center",
          WebkitBoxPack: "center",
          position: "relative",
          zIndex: 0,
          alignItems: "center",
          backgroundImage: "initial",
          backgroundColor: "transparent",
          boxShadow: "none",
          height: "auto",
          justifyContent: "center",
          cursor: "pointer",
          display: "flex",
          marginLeft: "12px",
          marginRight: "12px",
          userSelect: "none",
        }}
      >
        <div
          className="asa"
          style={{
            border: "none",
            outline: "none",
            WebkitBoxAlign: "center",
            alignItems: "center",
            WebkitBoxPack: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 0,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <div
            className="asl T-I-J3 J-J5-Ji"
            style={{
              position: "relative",
              background:
                'url("https://ssl.gstatic.com/mail/sprites/general_black-2eb471de5e5ea7371fa18ebc5339694d.png") 0px -460px no-repeat',
              verticalAlign: "middle",
              opacity: 1,
              backgroundPosition: "center center",
              backgroundImage:
                'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/report_baseline_nv700_20dp.png")',
              backgroundRepeat: "no-repeat",
              backgroundSize: "20px",
              margin: "0px",
              padding: "0px",
              transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "inline-block",
              height: "20px",
              marginTop: "0px",
              width: "20px",
            }}
          />
        </div>
      </div>
      <div
        className="T-I J-J5-Ji nX T-I-ax7 T-I-Js-Gs mA"
        aria-label="Delete"
        role="button"
        tabIndex="0"
        style={{
          borderRadius: "2px",
          whiteSpace: "nowrap",
          fontSize: "0.875rem",
          fontWeight: 500,
          textAlign: "center",
          borderBottomLeftRadius: "0px",
          borderTopLeftRadius: "0px",
          color: "rgb(68, 68, 68)",
          padding: "0px",
          WebkitUserDrag: "none",
          lineHeight: "18px",
          minWidth: "auto",
          outline: "none",
          background: "transparent",
          border: "none",
          margin: "0px",
          WebkitBoxAlign: "center",
          WebkitBoxPack: "center",
          position: "relative",
          zIndex: 0,
          alignItems: "center",
          backgroundImage: "initial",
          backgroundColor: "transparent",
          boxShadow: "none",
          display: "inline-flex",
          height: "auto",
          justifyContent: "center",
          cursor: "pointer",
          marginLeft: "12px",
          marginRight: "12px",
          userSelect: "none",
        }}
      >
        <div
          className="asa"
          style={{
            border: "none",
            outline: "none",
            WebkitBoxAlign: "center",
            alignItems: "center",
            WebkitBoxPack: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 0,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <div
            className="ar9 T-I-J3 J-J5-Ji"
            style={{
              position: "relative",
              background:
                'url("https://ssl.gstatic.com/mail/sprites/general_black-2eb471de5e5ea7371fa18ebc5339694d.png") 0px -417px no-repeat',
              verticalAlign: "middle",
              opacity: 1,
              backgroundPosition: "center center",
              backgroundImage:
                'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/delete_baseline_nv700_20dp.png")',
              backgroundRepeat: "no-repeat",
              backgroundSize: "20px",
              margin: "0px",
              padding: "0px",
              transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "inline-block",
              height: "20px",
              marginTop: "0px",
              width: "20px",
            }}
          />
        </div>
      </div>
    </div>
  );
};

const MailActions = () => {
  return (
    <div
      className="iH bzn"
      style={{
        // cssFloat: "left",
        whiteSpace: "nowrap",
        display: "flex",
        height: "20px",
        marginRight: "auto",
      }}
    >
      <div className="G-tF" style={{ display: "flex", height: "20px" }}>
        <div
          className="G-Ni G-aE J-J5-Ji"
          style={{
            position: "relative",
            display: "inline-flex",
            height: "100%",
            marginLeft: "-12px",
            paddingRight: "8px",
            minWidth: "20px",
          }}
        >
          <div
            className="T-I J-J5-Ji lS T-I-ax7 mA"
            aria-label="Back to Inbox"
            role="button"
            // tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              // WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "12px",
              marginRight: "28px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <div
                className="ar6 T-I-J3 J-J5-Ji"
                style={{
                  position: "relative",
                  background:
                    'url("https://ssl.gstatic.com/mail/sprites/general_black-2eb471de5e5ea7371fa18ebc5339694d.png") 0px -232px no-repeat',
                  verticalAlign: "middle",
                  opacity: 1,
                  backgroundPosition: "center center",
                  backgroundImage:
                    'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/arrow_back_baseline_nv700_20dp.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  paddingRight: "0px",
                  width: "20px",
                }}
              />
            </div>
          </div>
        </div>
        <ActionItem />
        <div
          className="G-Ni G-aE J-J5-Ji"
          style={{
            position: "relative",
            display: "inline-flex",
            height: "100%",
            marginLeft: "-12px",
            paddingRight: "8px",
            boxShadow: "rgba(100, 121, 143, 0.12) -1px 0px 0px inset",
            marginRight: "20px",
          }}
        >
          <div
            className="T-I J-J5-Ji bvt T-I-ax7 L3"
            aria-label="Mark as unread"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "12px",
              marginRight: "12px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <svg
                className="T-I-J3 J-J5-Ji kQ9Vzb aoH"
                height="20"
                width="20"
                focusable="false"
                viewBox="0 -960 960 960"
                style={{
                  position: "relative",
                  fill: "currentcolor",
                  flexShrink: 0,
                  verticalAlign: "middle",
                  color: "rgb(68, 71, 70)",
                  opacity: 1,
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  width: "20px",
                }}
              >
                <path d="M168-192q-29.7,0-50.85-21.16T96-264.04V-696.28Q96-726 117.15-747T168-768H553q-2,17-1,35.5t6,36.5H168L480-517l140-81q14,13 37,24t41,16L480-432L168-611v347H792V-558.46q20-4.54 37.5-14.04T864-594v329.77Q864-234 842.5-213T792-192H168Zm0-504v432V-696Zm576,72q-50,0-85-35t-35-85t35-85t85-35t85,35t35,85t-35,85t-85,35Z" />
              </svg>
            </div>
          </div>
          <div
            className="T-I J-J5-Ji uUQygd T-I-ax7 L3"
            aria-label="Snooze"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "12px",
              marginRight: "12px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <div
                className="brW T-I-J3 J-J5-Ji"
                style={{
                  position: "relative",
                  verticalAlign: "middle",
                  opacity: 1,
                  backgroundPosition: "center center",
                  backgroundImage:
                    'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/schedule_baseline_nv700_20dp.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  width: "20px",
                }}
              />
            </div>
          </div>
          <div
            className="T-I J-J5-Ji VJ T-I-ax7 L3"
            aria-label="Add to Tasks"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "12px",
              marginRight: "12px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <div
                className="Vj T-I-J3 J-J5-Ji"
                style={{
                  position: "relative",
                  verticalAlign: "middle",
                  opacity: 1,
                  backgroundPosition: "center center",
                  backgroundImage:
                    'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/add_task_baseline_nv700_20dp.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  width: "20px",
                }}
              />
            </div>
          </div>
        </div>
        <div
          className="G-Ni J-J5-Ji"
          style={{
            position: "relative",
            display: "inline-flex",
            height: "100%",
            marginLeft: "-12px",
            paddingRight: "8px",
          }}
        >
          <div
            id=":ls"
            className="T-I J-J5-Ji T-I-Js-IF ns T-I-ax7 L3"
            aria-expanded="false"
            aria-haspopup="false"
            aria-label="Move to"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              borderTopRightRadius: "0px",
              borderBottomRightRadius: "0px",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              display: "flex",
              marginLeft: "12px",
              marginRight: "12px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <div
                className="ase T-I-J3 J-J5-Ji"
                style={{
                  position: "relative",
                  background:
                    'url("https://ssl.gstatic.com/mail/sprites/general_black-2eb471de5e5ea7371fa18ebc5339694d.png") 0px -547px no-repeat',
                  verticalAlign: "middle",
                  opacity: 1,
                  backgroundPosition: "center center",
                  backgroundImage:
                    'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/drive_file_move_outline_baseline_nv700_20dp.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  width: "20px",
                }}
              />
            </div>
            <div
              className="G-asx T-I-J3 J-J5-Ji"
              aria-hidden="true"
              style={{
                background:
                  'url("https://ssl.gstatic.com/ui/v1/zippy/arrow_down.png") 0px 1px no-repeat',
                fontSize: "0px",
                opacity: 1,
                backgroundPosition: "center center",
                backgroundImage:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/arrow_drop_down_baseline_nv700_20dp.png")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
                padding: "0px",
                transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                height: "20px",
                width: "20px",
                border: "none",
                outline: "none",
                margin: "0px",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                marginTop: "0px",
                marginLeft: "0px",
                verticalAlign: "middle",
                display: "none",
              }}
            >
               
            </div>
          </div>
          <div
            id=":ln"
            className="T-I J-J5-Ji T-I-Js-Gs mw T-I-ax7 L3"
            aria-expanded="false"
            aria-haspopup="false"
            aria-label="Labels"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              borderBottomLeftRadius: "0px",
              borderTopLeftRadius: "0px",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "12px",
              marginRight: "12px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <div
                className="asb T-I-J3 J-J5-Ji"
                style={{
                  position: "relative",
                  background:
                    'url("https://ssl.gstatic.com/mail/sprites/general_black-2eb471de5e5ea7371fa18ebc5339694d.png") 0px -371px no-repeat',
                  verticalAlign: "middle",
                  opacity: 1,
                  backgroundPosition: "center center",
                  backgroundImage:
                    'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/label_baseline_nv700_20dp.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  width: "20px",
                }}
              />
            </div>
            <div
              className="G-asx T-I-J3 J-J5-Ji"
              aria-hidden="true"
              style={{
                background:
                  'url("https://ssl.gstatic.com/ui/v1/zippy/arrow_down.png") 0px 1px no-repeat',
                fontSize: "0px",
                opacity: 1,
                backgroundPosition: "center center",
                backgroundImage:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/arrow_drop_down_baseline_nv700_20dp.png")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
                padding: "0px",
                transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                height: "20px",
                width: "20px",
                border: "none",
                outline: "none",
                margin: "0px",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                marginTop: "0px",
                marginLeft: "0px",
                verticalAlign: "middle",
                display: "none",
              }}
            >
               
            </div>
          </div>
        </div>
        <div
          className="G-Ni J-J5-Ji"
          style={{
            position: "relative",
            display: "inline-flex",
            height: "100%",
            marginLeft: "-12px",
            paddingRight: "8px",
          }}
        >
          <div
            id=":lo"
            className="T-I J-J5-Ji nf T-I-ax7 L3"
            aria-expanded="false"
            aria-haspopup="false"
            aria-label="More email options"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              minWidth: "auto",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "12px",
              marginRight: "12px",
              userSelect: "none",
            }}
          >
            <div
              className="asa"
              style={{
                border: "none",
                outline: "none",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <div
                className="bjy T-I-J3 J-J5-Ji"
                style={{
                  position: "relative",
                  verticalAlign: "middle",
                  opacity: 1,
                  backgroundPosition: "center center",
                  backgroundImage:
                    'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/more_vert_baseline_nv700_20dp.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  margin: "0px",
                  padding: "0px",
                  transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "inline-block",
                  height: "20px",
                  marginTop: "0px",
                  width: "20px",
                }}
              />
            </div>
            <div
              className="G-asx T-I-J3 J-J5-Ji"
              style={{
                background:
                  'url("https://ssl.gstatic.com/ui/v1/zippy/arrow_down.png") 0px 1px no-repeat',
                fontSize: "0px",
                opacity: 1,
                backgroundPosition: "center center",
                backgroundImage:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/arrow_drop_down_baseline_nv700_20dp.png")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
                padding: "0px",
                transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                height: "20px",
                width: "20px",
                border: "none",
                outline: "none",
                margin: "0px",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxPack: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 0,
                marginTop: "0px",
                marginLeft: "0px",
                verticalAlign: "middle",
                display: "none",
              }}
            >
               
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavigationActions = () => {
  return (
    <div
      className="adF"
      style={{ textAlign: "right", display: "flex", height: "20px" }}
    >
      <div
        className="iG J-J5-Ji"
        style={{
          position: "relative",
          marginLeft: "10px",
          padding: "0px",
          WebkitBoxAlign: "center",
          alignItems: "center",
          display: "flex",
          height: "100%",
        }}
      >
        <div
          className="h0"
          style={{
            whiteSpace: "nowrap",
            color: "rgb(94, 94, 94)",
            textAlign: "right",
            padding: "0px",
            WebkitBoxAlign: "center",
            alignItems: "center",
            display: "flex",
            height: "100%",
            paddingRight: "0px",
          }}
        >
          <span
            id=":lp"
            className="adl"
            style={{
              textShadow: "none",
              margin: "0px",
              textDecoration: "none",
              WebkitFontSmoothing: "auto",
              fontSize: "0.75rem",
              letterSpacing: "normal",
              fontFamily:
                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            }}
          >
            <span className="ts" style={{ fontWeight: "inherit" }}>
              8
            </span>{" "}
            of{" "}
            <span className="ts" style={{ fontWeight: "inherit" }}>
              1,676
            </span>
          </span>
          <div
            id=":lr"
            className="T-I J-J5-Ji adg T-I-awG T-I-ax7 T-I-Js-IF L3"
            aria-label="Newer"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              borderTopRightRadius: "0px",
              borderBottomRightRadius: "0px",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              minWidth: "0px",
              marginRight: "0px",
              cursor: "pointer",
              marginLeft: "20px",
              userSelect: "none",
            }}
          >
            <span
              className="adi"
              aria-hidden="true"
              style={{ marginRight: "-3px", display: "none" }}
            >
               
            </span>
            <img
              className="adj T-I-J3"
              src="https://mail.google.com/mail/u/0/images/cleardot.gif"
              style={{
                background:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/sprite_black2.png") -21px -21px no-repeat',
                verticalAlign: "middle",
                opacity: 1,
                backgroundPosition: "center center",
                backgroundImage:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/chevron_left_baseline_nv700_20dp.png")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
                margin: "0px",
                padding: "0px",
                transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "inline-block",
                height: "20px",
                marginTop: "0px",
                width: "20px",
              }}
            />
          </div>
          <div
            id=":li"
            className="T-I J-J5-Ji adg T-I-awG T-I-ax7 T-I-Js-Gs L3"
            aria-label="Older"
            role="button"
            tabIndex="0"
            style={{
              borderRadius: "2px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
              borderBottomLeftRadius: "0px",
              borderTopLeftRadius: "0px",
              color: "rgb(68, 68, 68)",
              padding: "0px",
              WebkitUserDrag: "none",
              lineHeight: "18px",
              outline: "none",
              background: "transparent",
              border: "none",
              margin: "0px",
              WebkitBoxAlign: "center",
              WebkitBoxPack: "center",
              position: "relative",
              zIndex: 0,
              alignItems: "center",
              backgroundImage: "initial",
              backgroundColor: "transparent",
              boxShadow: "none",
              display: "inline-flex",
              height: "auto",
              justifyContent: "center",
              minWidth: "0px",
              marginRight: "0px",
              cursor: "pointer",
              marginLeft: "20px",
              userSelect: "none",
            }}
          >
            <span
              className="adi"
              aria-hidden="true"
              style={{ marginRight: "-3px", display: "none" }}
            >
               
            </span>
            <img
              className="adk T-I-J3"
              src="https://mail.google.com/mail/u/0/images/cleardot.gif"
              style={{
                background:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/sprite_black2.png") -42px -21px no-repeat',
                verticalAlign: "middle",
                opacity: 1,
                backgroundPosition: "center center",
                backgroundImage:
                  'url("https://ssl.gstatic.com/ui/v1/icons/mail/gm3/1x/chevron_right_baseline_nv700_20dp.png")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
                margin: "0px",
                padding: "0px",
                transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "inline-block",
                height: "20px",
                marginTop: "0px",
                width: "20px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Component() {
  return (
    <div className={`G-atb D E ${styles.container}`}>
      <MailActions />
      <NavigationActions />
    </div>
  );
}
