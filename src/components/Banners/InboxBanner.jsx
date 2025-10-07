import { useMemo } from "react";
import { CATEGORIES } from "../../utils/categories";

export default function InboxBanner({ activeInboxTab, setActiveInboxTab, rows }) {

    const activeTabClass = "J-KU-KO aIf-aLe";

    const counts = useMemo(() => {
        const tabs = Object.values(CATEGORIES);
        const result = {};
        for (const t of tabs) {
            result[t] = rows.filter(
                (row) => row.labels.includes("Inbox") && row.labels.includes(t) && !row.read
            ).length;
        }
        return result;
    }, [rows]);

    const previews = useMemo(() => {
        const result = {};
        for (const t of Object.values(CATEGORIES)) {
            const msgs = rows.filter(r => r.labels.includes("Inbox") && r.labels.includes(t));
            const latest = msgs.sort((a, b) => b.updatedAt - a.updatedAt)[0];
            result[t] = latest ? `${latest.from?.name || latest.from?.email || ""} — ${latest.subject}` : "";
        }
        return result;
    }, [rows]);
    
    const isActiveTab = (tab) => activeInboxTab === tab;
    
    return (
        <div className="aKh" jsaction="taiVP:.CLIENT">
            <table className="aKk">
                <tbody>
                    <tr
                        className="aAA J-KU-Jg J-KU-Jg-K9"
                        role="tablist"
                        aria-activedescendant=""
                        style={{ userSelect: "none" }}
                    >
                        <td
                            className="aRz J-KU"
                            role="heading"
                            aria-level={3}
                            style={{
                                userSelect: "none",
                                width: 253,
                            }}
                            onClick={() => setActiveInboxTab("Primary")}
                        >
                            <div
                                className={`aAy J-KU-KO ${isActiveTab("Primary") ? activeTabClass : ""}`}
                                tabIndex={0}
                                role="tab"
                                jslog="162884; u014N:xr6bB; 16:WzFd"
                                aria-selected="true"
                                id=":27"
                                aria-controls=":1z"
                                aria-label="Primary"
                                style={{
                                    userSelect: "none",
                                    width: 251,
                                    borderLeftWidth: 1,
                                }}
                            >
                                <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKp aIf-aLf" style={{ userSelect: "none" }} />
                                <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                        <div className="aKx" style={{ userSelect: "none" }}>
                                            <div
                                                className="aDG"
                                                style={{
                                                    display: "none",
                                                    userSelect: "none",
                                                }}
                                                data-tooltip-align="t,l"
                                            />
                                            <div
                                                id=":23"
                                                className="aKz"
                                                data-tooltip-align="t,l"
                                                data-tooltip="Person-to-person conversations and messages that don't appear in other tabs."
                                                style={{ userSelect: "none" }}
                                            >
                                                Primary
                                            </div>
                                        </div>
                                        <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }} />
                                </div>
                            </div>
                        </td>
                        <td
                            className="aRz J-KU"
                            role="heading"
                            aria-level={3}
                            style={{
                                userSelect: "none",
                                width: 253,
                            }}
                            onClick={() => setActiveInboxTab("Promotions")}
                        >
                            <div
                                className={`aAy aJi-aLe aE2 ${isActiveTab("Promotions") ? activeTabClass : ""}`}
                                tabIndex={0}
                                role="tab"
                                jslog="162884; u014N:xr6bB; 16:WzNd"
                                aria-selected="false"
                                id=":28"
                                aria-controls=":20"
                                aria-label="Promotions, one new message,"
                                style={{
                                    userSelect: "none",
                                    width: 252,
                                }}
                            >
                                <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKp aJi-aLf" style={{ userSelect: "none" }} />
                                <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                        <div className="aKx" style={{ userSelect: "none" }}>
                                            {counts["Promotions"] > 0 && <div className="aDG" style={{ userSelect: "none" }} data-tooltip-align="t,l">
                                                {counts["Promotions"] > 0 ? `${counts["Promotions"]} new` : null}
                                            </div>}
                                            <div
                                                id=":24"
                                                className="aKz"
                                                data-tooltip-align="t,l"
                                                data-tooltip="Marketing, interests, social and political causes, and other promotional emails."
                                                style={{ userSelect: "none" }}
                                            >
                                                Promotions
                                            </div>
                                        </div>
                                        <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }}>
                                        {previews["Promotions"]}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            className="aRz J-KU"
                            role="heading"
                            aria-level={3}
                            style={{
                                userSelect: "none",
                                width: 253,
                            }}
                            onClick={() => setActiveInboxTab("Social")}
                        >
                            <div
                                className={`aAy aKe-aLe ${isActiveTab("Social") ? activeTabClass : ""}`}
                                tabIndex={0}
                                role="tab"
                                jslog="162884; u014N:xr6bB; 16:WzJd"
                                aria-selected="false"
                                id=":29"
                                aria-controls=":21"
                                aria-label="Social"
                                style={{
                                    userSelect: "none",
                                    width: 252,
                                }}
                            >
                                <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKp aKe-aLf" style={{ userSelect: "none" }} />
                                <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                        <div className="aKx" style={{ userSelect: "none" }}>
                                            <div
                                                className="aDG"
                                                style={{
                                                    display: "none",
                                                    userSelect: "none",
                                                }}
                                                data-tooltip-align="t,l"
                                            />
                                            <div
                                                id=":25"
                                                className="aKz"
                                                data-tooltip-align="t,l"
                                                data-tooltip="Messages from social networks, media-sharing sites, online dating services, and other social websites."
                                                style={{ userSelect: "none" }}
                                            >
                                                Social
                                            </div>
                                        </div>
                                        <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }} />
                                </div>
                            </div>
                        </td>
                        <td
                            className="aRz J-KU"
                            role="heading"
                            aria-level={3}
                            style={{
                                userSelect: "none",
                                width: 253,
                            }}
                            onClick={() => setActiveInboxTab("Updates")}
                        >
                            <div
                                className={`aAy aH2-aLe aE2 ${isActiveTab("Updates") ? activeTabClass : ""}`}
                                tabIndex={0}
                                role="tab"
                                jslog="162884; u014N:xr6bB; 16:WzRd"
                                aria-selected="false"
                                id=":2a"
                                aria-controls=":22"
                                aria-label="Updates, 2 new messages,"
                                style={{
                                    userSelect: "none",
                                    width: 252,
                                }}
                            >
                                <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                <div className="aKp aH2-aLf" style={{ userSelect: "none" }} />
                                <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                        <div className="aKx" style={{ userSelect: "none" }}>
                                            {counts["Updates"] > 0 && <div className="aDG" style={{ userSelect: "none" }} data-tooltip-align="t,l">
                                                {counts["Updates"] > 0 ? `${counts["Updates"]} new` : null}
                                            </div>}
                                            <div
                                                id=":26"
                                                className="aKz"
                                                data-tooltip-align="t,l"
                                                data-tooltip="Personal, auto-generated updates including confirmations, receipts, bills, and statements."
                                                style={{ userSelect: "none" }}
                                            >
                                                Updates
                                            </div>
                                        </div>
                                        <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }}>
                                        {previews["Updates"]}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td className="aKl sf-hidden" colSpan={6}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}