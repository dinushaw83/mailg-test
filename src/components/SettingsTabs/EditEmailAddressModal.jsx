import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, Box } from "@mui/material";

export default function EditEmailAddressModal({ open, onClose, fullName = "John Doe", email = "john.doe@example.com" }) {
  const firstLast = useMemo(() => {
    const [first, ...rest] = fullName.split(" ");
    return { first: first || "John", last: rest.join(" ") || "Doe" };
  }, [fullName]);

  const [useCustomName, setUseCustomName] = useState(false);
  const [customName, setCustomName] = useState("");
  const [showReplyTo, setShowReplyTo] = useState(false);

  const handleCancel = () => onClose?.();
  const handleSave = () => onClose?.();

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: 1,
          width: 600,
          height: 450,
          backgroundColor: "#FFF7D7",
        },
      }}
    >
      <Box
        sx={{
          fontFamily: "arial, sans-serif",
          backgroundColor: "rgb(250, 209, 99)",
          p: "4px",
          fontWeight: "bold",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      >
        Edit email address
      </Box>

      <DialogContent sx={{ p: 0, backgroundColor: "#FFF7D7" }}>
        <table id="ipanel" width="97%" cellPadding="8" cellSpacing="0" style={{ fontFamily: "arial, sans-serif", margin: 8 }}>
          <tbody>
            <tr style={{ fontSize: "80%" }}>
              <td style={{ fontFamily: "arial, sans-serif" }}>
                <strong>{`Edit information for ${email}`}</strong>
                <br />
                <span style={{ fontSize: "80%" }}>
                  (your name and email address will be shown on mail you send)
                </span>
              </td>
            </tr>
            <tr style={{ fontSize: "80%" }}>
              <td
                className="prefs"
                colSpan="2"
                height="2"
                style={{
                  fontFamily: "arial, sans-serif",
                  backgroundColor: "rgb(250, 209, 99)",
                  padding: "0px",
                }}
              />
            </tr>
            <tr>
              <td style={{ fontFamily: "arial, sans-serif" }}>
                <form name="mainForm" method="POST" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <input id="cfrp" name="cfrp" type="hidden" defaultValue="1" style={{ fontFamily: "arial, sans-serif" }} />
                  <table cellPadding="2" cellSpacing="0">
                    <tbody>
                      <tr style={{ fontSize: "80%" }}>
                        <td width="120" style={{ fontFamily: "arial, sans-serif" }}>Name:&nbsp;</td>
                        <td style={{ fontFamily: "arial, sans-serif" }}>
                          <table cellPadding="1" cellSpacing="0">
                            <tbody>
                              <tr style={{ fontSize: "80%" }}>
                                <td style={{ fontFamily: "arial, sans-serif" }}>
                                  <input
                                    id="cfgnr_0"
                                    className="in"
                                    name="cfgnr"
                                    type="radio"
                                    checked={!useCustomName}
                                    onChange={() => setUseCustomName(false)}
                                    value="0"
                                  />
                                </td>
                                <td style={{ fontFamily: "arial, sans-serif" }}>
                                  <label htmlFor="cfgnr_0">
                                    <b>{fullName}</b>{" "}
                                    <span style={{ fontSize: "80%" }}>(your name in MailG accounts)</span>
                                  </label>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ fontFamily: "arial, sans-serif" }}>
                                  <input
                                    id="cfgnr_1"
                                    className="in"
                                    name="cfgnr"
                                    type="radio"
                                    checked={useCustomName}
                                    onChange={() => setUseCustomName(true)}
                                    value="1"
                                  />
                                </td>
                                <td style={{ fontFamily: "arial, sans-serif" }}>
                                  <input
                                    id="cfn"
                                    className="in"
                                    name="cfn"
                                    type="text"
                                    maxLength="96"
                                    size={16}
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder={`${firstLast.first} ${firstLast.last}`}
                                    style={{ fontFamily: "arial, sans-serif", verticalAlign: "middle" }}
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr style={{ fontSize: "80%" }}>
                        <td style={{ fontFamily: "arial, sans-serif" }}>
                          <label htmlFor="focus">Email address:&nbsp;</label>
                        </td>
                        <td className="b" style={{ fontFamily: "arial, sans-serif", fontWeight: "bold" }}>
                          {email}
                        </td>
                      </tr>
                      <tr id="rt_l" style={{ fontSize: "80%" }}>
                        <td style={{ fontFamily: "arial, sans-serif" }} />
                        <td style={{ fontFamily: "arial, sans-serif" }}>
                          <span
                            id="diff_reply_to"
                            className="lk in"
                            style={{ textDecoration: "underline", whiteSpace: "nowrap", color: "rgb(0, 0, 204)", cursor: "pointer" }}
                            onClick={() => setShowReplyTo((v) => !v)}
                          >
                            Specify a different "reply-to" address
                          </span>{" "}
                          <span style={{ fontSize: "80%" }}>(optional)</span>
                        </td>
                      </tr>
                      <tr id="rt_f" style={{ fontSize: "80%", display: showReplyTo ? undefined : "none" }}>
                        <td style={{ fontFamily: "arial, sans-serif" }}>
                          <label htmlFor="cfrt">Reply-to address:&nbsp;</label>
                        </td>
                        <td style={{ fontFamily: "arial, sans-serif" }}>
                          <input id="cfrt" name="cfrt" size={30} style={{ fontFamily: "arial, sans-serif" }} />
                          <br />
                          <span style={{ fontSize: "80%" }}>
                            (a reply to mail you send will go to this address. {" "}
                            <a href="http://localhost:3000/settings/accounts" target="_blank" style={{ fontFamily: "arial, sans-serif" }}>Learn&nbsp;more</a>)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: "arial, sans-serif" }}>&nbsp;</td>
                        <td style={{ fontFamily: "arial, sans-serif" }}>&nbsp;</td>
                      </tr>
                      <tr>
                        <td colSpan="2" style={{ fontFamily: "arial, sans-serif", textAlign: "right", paddingRight: 16 }}>
                          <input
                            id="bttn_cancel"
                            className="in"
                            type="button"
                            defaultValue="Cancel"
                            onClick={handleCancel}
                            style={{ fontFamily: "arial, sans-serif", fontWeight: "normal", fontSize: "0.8rem", padding: "3px 7px", marginRight: 5 }}
                          />
                          <input id="bttn_close" className="in" type="button" defaultValue="Close" style={{ fontFamily: "arial, sans-serif", fontWeight: "normal", display: "none" }} />
                          &nbsp;
                          <input
                            id="bttn_sub"
                            className="in"
                            type="submit"
                            value="Save Changes"
                            style={{ fontFamily: "arial, sans-serif", fontWeight: 600, fontSize: "0.8rem", padding: "3px 7px" }}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}


