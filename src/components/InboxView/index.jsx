import React, { useContext, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import ActionBar from "./ActionBar";

const InboxView = () => {
  const { inboxId } = useParams();
  const { state } = useContext(GlobalContext);

  const email = useMemo(() => {
    if (!state?.emails) return null;
    // IDs in fixtures are numbers; support string compare just in case
    return state.emails.find((e) => String(e.id) === String(inboxId));
  }, [state?.emails, inboxId]);

  if (!email) {
    return (
      <div className="nH bkK" style={{ padding: 24 }}>
        <h2 style={{ margin: 0 }}>Email not found</h2>
        <p style={{ marginTop: 8 }}>
          The message you’re looking for doesn’t exist. Go back to{" "}
          <Link to="/">Inbox</Link>.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(email.timestamp).toLocaleString();

  return (
    <div className="nH bkK">
      <div className="nH">
        <div className="nH ar4 z">
          <div className="AO">
            <div className="Tm" style={{ minHeight: 600 }}>
              <div className="aeF" style={{ minHeight: 400 }}>
                <div className="nH" role="main">
                  <div className="bGI nH oy8Mbf aE3 S4" style={{ padding: 24 }}>
                    <ActionBar />
                    <div className="a0V" style={{ marginBottom: 8 }}>
                      <h2 style={{ margin: 0 }}>
                        {email.subject || "Ola Amigos"}
                      </h2>
                    </div>
                    <div
                      style={{ display: "flex", gap: 12, alignItems: "center" }}
                    >
                      <div
                        className="T-KT T-KT-Jp"
                        aria-label={email.starred ? "Starred" : "Not starred"}
                        role="img"
                        title={email.starred ? "Starred" : "Not starred"}
                      >
                        {email.starred && (
                          <img
                            className="T-KT-JX"
                            src="/assets/images/pr_2_image_1.gif"
                            alt="Starred"
                          />
                        )}
                      </div>
                      <div style={{ color: "#5f6368" }}>
                        From: <strong>{email.from.name}</strong> (
                        {email.from.email})
                      </div>
                      <div style={{ color: "#5f6368" }}>
                        To: <strong>{email.to}</strong>
                      </div>
                      <div style={{ marginLeft: "auto", color: "#5f6368" }}>
                        {formattedDate}
                      </div>
                    </div>

                    <hr
                      style={{
                        border: 0,
                        borderTop: "1px solid #e0e0e0",
                        margin: "16px 0",
                      }}
                    />

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        fontSize: 14,
                      }}
                    >
                      {email.body}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxView;
