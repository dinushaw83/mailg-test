import React from "react";
import SearchBar from "./SearchBar";

const Header = () => {
  return (
    <div className="nH">
      <div className="w-asV bbg aiw">
        <div id=":d">
          <div id=":7" style={{ display: "none" }} />
          <h1 className="qp">
            <header
              className="gb_Fa gb_ub gb_zd gb_Nd gb_bd"
              id="gb"
              role="banner"
              style={{ backgroundColor: "transparent" }}
            >
              <div className="gb_7d">
                <div className="gb_6c gb_4c gb_bd">
                  <div className="gb_gd">
                    <div className="gb_Qc">
                      <div className="gb_Rc gb_ie">
                        <a className="gb_ce gb_Sc gb_ge" aria-label="MailG" href="#inbox">
                          <span className="gb_Xc gb_fe" aria-hidden="true" role="presentation" />
                        </a>
                        <div className="gb_je sf-hidden">MailG</div>
                      </div>
                    </div>
                  </div>
                  <div className="gb_cd" />
                </div>
              </div>
              <div className="gb_Id gb_Ld gb_0d">
                <div className="gb_Qd gb_pd gb_qd" style={{ minWidth: 238 }}>
                  <div
                    className="gb_Zc"
                    aria-expanded="true"
                    aria-label="Main menu"
                    data-ogmb={1}
                    role="button"
                    tabIndex={0}
                  >
                    <svg focusable="false" viewBox="0 0 24 24">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                    </svg>
                  </div>
                  <div
                    className="gb_Zc gb_2c gb_R sf-hidden"
                    aria-label="Go back"
                    title="Go back"
                    role="button"
                    tabIndex={0}
                  >
                    <svg focusable="false" viewBox="0 0 24 24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </div>
                  <div className="gb_Zc gb_k gb_R sf-hidden" aria-label="Close" role="button" tabIndex={0}>
                    <svg viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </div>
                  <div className="gb_Qc">
                    <div className="gb_Rc gb_ie">
                      <a className="gb_ce gb_Sc gb_ge" aria-label="MailG" href="/">
                        <img
                          className="gb_Xc"
                          src="/assets/images/mailg-logo.svg"
                          srcSet=""
                          alt=""
                          aria-hidden="true"
                          role="presentation"
                          style={{ width: 109, height: 40 }}
                          sizes=""
                        />
                      </a>
                    </div>
                  </div>
                  <div className="gb_Qd gb_R gb_nd gb_od sf-hidden" />
                </div>
                <div className="gb_Qd gb_Ud gb_Se gb_Te gb_Oe">
                  <div className="gb_j gb_qe" />
                  <SearchBar />
                  <div className="gb_v gb_qe bGJ">
                    <div className="zo" data-tooltip="Support">
                      <a
                        className="gb_re gb_h gb_Cd t6"
                        role="button"
                        id="lZwQje"
                        tabIndex={0}
                        aria-label="Support"
                        aria-expanded="false"
                        aria-haspopup="true"
                        aria-controls="M842Cd"
                      >
                        <svg
                          className="t7"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24px"
                          height="24px"
                          viewBox="0 0 24 24"
                          fill="#000000"
                          focusable="false"
                        >
                          <path fill="none" d="M0 0h24v24H0z" />
                          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
                        </svg>
                      </a>
                    </div>
                    <div
                      id="M842Cd"
                      className="t9"
                      role="menu"
                      tabIndex={0}
                      aria-hidden="true"
                      style={{ display: "none" }}
                    />
                    <div className="FI" data-tooltip="Settings" jslog="85046; u014N:cOuCgd,Kr2w4b,xr6bB;">
                      <a
                        className="FH"
                        role="button"
                        tabIndex={0}
                        aria-label="Settings"
                        aria-expanded="false"
                        aria-haspopup="true"
                      >
                        <svg
                          className="Xy"
                          xmlns="http://www.w3.org/2000/svg"
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                        >
                          <path d="M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22zm-3.23-2h2.76l.37-2.55.53-.22c.44-.18.88-.44 1.34-.78l.45-.34 2.38.96 1.38-2.4-2.03-1.58.07-.56c.03-.26.06-.51.06-.78s-.03-.53-.06-.78l-.07-.56 2.03-1.58-1.39-2.4-2.39.96-.45-.35c-.42-.32-.87-.58-1.33-.77l-.52-.22-.37-2.55h-2.76l-.37 2.55-.53.21c-.44.19-.88.44-1.34.79l-.45.33-2.38-.95-1.39 2.39 2.03 1.58-.07.56a7 7 0 0 0-.06.79c0 .26.02.53.06.78l.07.56-2.03 1.58 1.38 2.4 2.39-.96.45.35c.43.33.86.58 1.33.77l.53.22.38 2.55z" />
                          <circle cx={12} cy={12} r="3.5" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="gb_Vd gb_rb gb_Qd gb_2d" data-ogsr-up="">
                  <div className="gb_Ad">
                    <div className="gb_hd">
                      <div className="gb_J gb_td gb_0" data-ogsr-fb="true" data-ogsr-alt="" id="gbwa">
                        <div className="gb_D">
                          <a
                            className="gb_B"
                            aria-label="MailG apps"
                            href="#"
                            aria-expanded="false"
                            role="button"
                            tabIndex={0}
                          >
                            <svg className="gb_F" focusable="false" viewBox="0 0 24 24">
                              <path d="M6,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM16,6c0,1.1 0.9,2 2,2s2,-0.9 2,-2 -0.9,-2 -2,-2 -2,0.9 -2,2zM12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2z" />
                              <image
                                src="#"
                                alt=""
                                height={24}
                                width={24}
                                style={{
                                  border: "none",
                                  display: "none 9",
                                }}
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="gb_z gb_td gb_Pf gb_0">
                      <div className="gb_D gb_qb gb_Pf gb_0">
                        <a
                          className="gb_B gb_Za gb_0"
                          aria-expanded="false"
                          aria-label="Google Account: "
                          href="#"
                          tabIndex={0}
                          role="button"
                          style={{
                            backgroundColor: "#6EA034",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            className="gb_ae"
                            style={{ fontWeight: "500", fontSize: "20px", color: "white" }}
                          >
                            J
                          </span>
                          {/* <div className="gb_Q gb_R sf-hidden" aria-hidden="true">
                            <svg
                              className="gb_Ka"
                              height={14}
                              viewBox="0 0 14 14"
                              width={14}
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle className="gb_La" cx={7} cy={7} r={7} />
                              <path className="gb_Na" d="M6 10H8V12H6V10ZM6 2H8V8H6V2Z" />
                            </svg>
                          </div> */}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="gb_a gb_Ld" />
            </header>
          </h1>
        </div>
        <div>
          <div id=":g" />
          <div id=":j">
            <div>
              <div className="w-asK w-atd" style={{ display: "none" }} />
            </div>
          </div>
          <div id=":i" />
          <div id=":b">
            <div
              className="b8 UC"
              aria-live="assertive"
              aria-atomic="true"
              role="alert"
              style={{ position: "relative", top: "-10000px" }}
            >
              <div className="J-J5-Ji">
                <div className="UD sf-hidden" />
                <div className="vh" />
                <div className="UB sf-hidden" />
              </div>
            </div>
          </div>
        </div>
        <div id=":c" />
      </div>
    </div>
  );
};

export default Header;
