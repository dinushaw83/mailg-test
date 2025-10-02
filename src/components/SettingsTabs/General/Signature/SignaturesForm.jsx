import { styled } from "@mui/material/styles";

const Container = styled("div")({
    borderCollapse: "collapse",
    borderSpacing: "2px",
    fontSize: "14px",
    font: '14px / 20px "Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
    lineHeight: "20px",
});


export default function SignaturesForm() {
    return (
        <Container className="Tb">
            <div id=":5he" className="Tb">
                <Form />
                <div className="P4">
                    <button
                        id=":5hf"
                        className="P5"
                        aria-label="Create a new signature"
                        role="button"
                        tabIndex="0"
                        style={{
                            border: "none",
                            background: "none",
                            borderRadius: "4px",
                            outline: "none",
                            padding: "0px 16px",
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
                            boxShadow: "rgb(218, 220, 224) 0px 0px 0px 1px inset",
                            color: "rgb(26, 115, 232)",
                            marginBottom: "32px",
                            marginTop: "8px",
                            width: "240px",
                        }}
                    >
                        Create new
                    </button>
                </div>
                <div
                    className="Pr"
                    style={{
                        WebkitFontSmoothing: "antialiased",
                        fontFamily:
                            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                        fontSize: "0.875rem",
                        letterSpacing: "normal",
                        fontWeight: 500,
                        marginBottom: "8px",
                    }}
                >
                    Signature defaults
                </div>
                <div className="P2" style={{ display: "flex" }}>
                    <label className="aaJ" style={{ marginRight: "16px" }}>
                        <div
                            className="P0"
                            style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily:
                                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                letterSpacing: "normal",
                                color: "rgb(95, 99, 104)",
                                marginBottom: "4px",
                            }}
                        >
                            FOR NEW EMAILS USE
                        </div>
                        <select
                            id=":5i5"
                            className="Ps"
                            style={{
                                fontFamily:
                                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                display: "block",
                                width: "176px",
                            }}
                        >
                            <option value="-1">No signature</option>
                            <option value="4582351273062553595">sas</option>
                        </select>
                    </label>
                    <label>
                        <div
                            className="P0"
                            style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily:
                                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                letterSpacing: "normal",
                                color: "rgb(95, 99, 104)",
                                marginBottom: "4px",
                            }}
                        >
                            ON REPLY/FORWARD USE
                        </div>
                        <select
                            id=":5i6"
                            className="Ps"
                            style={{
                                fontFamily:
                                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                display: "block",
                                width: "176px",
                            }}
                        >
                            <option value="-1">No signature</option>
                            <option value="4582351273062553595">sas</option>
                        </select>
                    </label>
                </div>
                <label>
                    <input
                        id=":5hd"
                        className="TQ"
                        type="checkbox"
                        style={{
                            fontFamily:
                                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                            margin: "0px",
                            fontSize: "100%",
                            marginTop: "16px",
                            fontWeight: "normal",
                        }}
                    />{" "}
                    Insert signature before the quoted text in replies, and remove the
                    '--' line that precedes it.
                </label>
            </div>
        </Container>
    );
}


function Form() {
    const SignaturesListContainer = styled("div")({
        borderRight: "1px solid rgb(218, 220, 224)",
        flex: "1 0 240px",
        overflow: "auto",
        padding: "8px 0px",
        WebkitFontSmoothing: "antialiased",
        fontFamily:
            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
        fontSize: "0.875rem",
        letterSpacing: "normal",
        color: "rgb(32, 33, 36)",
        WebkitBoxFlex: "1",
    });

    const SignatureName = styled("span")({
        overflow: "hidden",
        whiteSpace: "nowrap",
        flex: "1 1 auto",
        margin: "8px 0px 8px 16px",
        textOverflow: "ellipsis",
        WebkitBoxFlex: "1",
        width: "168px",
    });

    const SignatureItem = styled("div")({
        WebkitBoxAlign: "center",
        alignItems: "center",
        cursor: "pointer",
        display: "flex",
        height: "40px",
        backgroundColor: "rgba(66, 133, 244, 0.12)",
        paddingRight: "8px",
        paddingLeft: "8px",

        "&:hover": {
            backgroundColor: "rgba(66, 133, 244, 0.2)",
        },
    });

    return (
        <div
            className="Ia"
            style={{
                background: "white",
                border: "1px solid rgb(218, 220, 224)",
                borderRadius: "8px",
                overflow: "hidden",
                display: "flex",
                height: "168px",
                width: "720px",
            }}
        >
            <SignaturesListContainer>
                <SignatureItem>
                    <SignatureName>sas</SignatureName>
                    <span
                        className="material-symbols-outlined"
                        style={{
                            fontSize: 20,
                            opacity: 0.71,
                            cursor: "pointer",
                            verticalAlign: "middle",
                            marginRight: "20px",
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Edit signature name"
                    >
                        edit
                    </span>
                    <span
                        className="material-symbols-outlined"
                        style={{
                            fontSize: 20,
                            opacity: 0.71,
                            cursor: "pointer",
                            verticalAlign: "middle",
                            marginRight: "16px",
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Delete signature"
                    >
                        delete
                    </span>
                </SignatureItem>
            </SignaturesListContainer>
            <div style={{ display: "flex", flexDirection: "column", flex: "2 2 480px" }}>
                {/* Signature editor area */}
                <div
                    contentEditable
                    role="textbox"
                    aria-label="Signature"
                    style={{
                        minHeight: "100px",
                        padding: "8px 10px",
                        border: "1px solid #e5e5e5",
                        font: 'small/1.5 Arial, Helvetica, sans-serif',
                        overflowY: "auto",
                    }}
                >
                    {/* User types signature here */}
                </div>

                {/* Toolbar */}
                <div
                    role="toolbar"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        borderTop: "1px solid #e5e5e5",
                        padding: "4px 8px",
                        height: "40px",
                    }}
                >
                    <button aria-label="Bold"><span className="material-symbols-outlined">format_bold</span></button>
                    <button aria-label="Italic"><span className="material-symbols-outlined">format_italic</span></button>
                    <button aria-label="Underline"><span className="material-symbols-outlined">format_underlined</span></button>
                    <button aria-label="Insert link"><span className="material-symbols-outlined">link</span></button>
                    <button aria-label="Insert image"><span className="material-symbols-outlined">image</span></button>
                </div>
            </div>
        </div>
    )
}