export default function SpamBanner() {
    return (
        <>
            <div>
                <div
                    className="ya"
                    style={{
                        borderBottom: "1px solid rgba(100, 121, 143, 0.12)",
                        textAlign: "center",
                        border: "none",
                        borderRadius: "4px",
                        margin: "4px 0px",
                        padding: "6px 16px",
                        WebkitFontSmoothing: "antialiased",
                        fontFamily:
                            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                        fontSize: "0.875rem",
                        letterSpacing: "normal",
                        WebkitBoxAlign: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(241, 243, 244, 0.87)",
                        boxSizing: "border-box",
                        color: "rgb(95, 99, 104)",
                        display: "flex",
                        flexWrap: "wrap",
                        WebkitBoxPack: "center",
                        justifyContent: "center",
                        minHeight: "48px",
                        paddingTop: "6px",
                        paddingBottom: "6px",
                    }}
                >
                    Messages that have been in Spam more than 30 days will be
                    automatically deleted.
                    <span
                        id=":1qg"
                        className="x2"
                        role="button"
                        tabIndex="0"
                        style={{
                            border: "none",
                            background: "none",
                            borderRadius: "4px",
                            outline: "none",
                            padding: "0px 8px",
                            textDecoration: "none",
                            whiteSpace: "pre-wrap",
                            WebkitBoxAlign: "center",
                            alignItems: "center",
                            display: "inline-flex",
                            WebkitBoxPack: "center",
                            justifyContent: "center",
                            position: "relative",
                            zIndex: 0,
                            WebkitFontSmoothing: "antialiased",
                            fontFamily:
                                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                            fontSize: "0.875rem",
                            letterSpacing: "normal",
                            boxSizing: "border-box",
                            cursor: "pointer",
                            fontWeight: 500,
                            height: "36px",
                            minWidth: "80px",
                            color: "rgb(26, 115, 232)",
                            marginLeft: "4px",
                        }}
                    >
                        Delete all spam messages now
                    </span>
                </div>
            </div>
        </>
    );
}