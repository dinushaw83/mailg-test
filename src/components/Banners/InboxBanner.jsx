import { CATEGORIES } from "../../utils/categories";
import styled from "@emotion/styled";
import { useMemo } from "react";
import { useSelector } from "react-redux";

const TabCell = styled.td`
  user-select: none;
  width: 15%;
  min-width: 150px;
  max-width: 250px;
  cursor: pointer;
  vertical-align: top;
  text-align: left;
`;

const TabWrapper = styled.div`
  user-select: none;
  width: 100%;
`;

const TabContent = styled.div`
  user-select: none;
`;

function InboxTab({ tab, isActive, activeTabClass, onClick, counts, previews, tabClass, tooltip, iconClass }) {
  return (
    <TabCell className="aRz J-KU" role="heading" aria-level={3} onClick={() => onClick(tab)}>
      <TabWrapper
        className={`aAy ${tabClass} ${isActive ? activeTabClass : ""}`}
        tabIndex={0}
        role="tab"
        aria-selected={isActive}
        aria-label={`${tab}${counts[tab] > 0 ? `, ${counts[tab]} new message${counts[tab] > 1 ? "s" : ""}` : ""}`}
      >
        <div className={`aKp ${iconClass}`} />
        <TabContent className="aKw">
          <div className="aKy">
            <div className="aKx">
              {counts[tab] > 0 && (
                <div className="aDG" data-tooltip-align="t,l">
                  {`${counts[tab]} new`}
                </div>
              )}
              <div className="aKz" data-tooltip-align="t,l" data-tooltip={tooltip}>
                {tab}
              </div>
            </div>
            <div className="aKv" />
          </div>
          <div className="aKn" />
          <div className="aKs">{previews[tab]}</div>
        </TabContent>
      </TabWrapper>
    </TabCell>
  );
}

export default function InboxBanner({ activeInboxTab, setActiveInboxTab, rows }) {
  const activeTabClass = "J-KU-KO aIf-aLe";
  const emailCounts = useSelector((state) => state.mail.emailCounts);

  // Old implementation: Calculate counts from rows (client-side)
  // const counts = useMemo(() => {
  //   const tabs = Object.values(CATEGORIES);
  //   const result = {};
  //   for (const t of tabs) {
  //     result[t] = rows.filter(
  //       (row) => row.labels.includes("Inbox") && row.labels.includes(t) && row.unreadCount > 0
  //     ).length;
  //   }
  //   return result;
  // }, [rows]);

  // New implementation: Use counts from Redux (fetched via API)
  const counts = useMemo(() => {
    const result = {};
    result.Primary = emailCounts.primary || 0;
    result.Promotions = emailCounts.promotions || 0;
    result.Social = emailCounts.social || 0;
    result.Updates = emailCounts.updates || 0;
    return result;
  }, [emailCounts]);

  const previews = useMemo(() => {
    const result = {};
    for (const t of Object.values(CATEGORIES)) {
      const msgs = rows.filter((r) => r.labels.includes("Inbox") && r.labels.includes(t));
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
          <tr className="aAA J-KU-Jg J-KU-Jg-K9" role="tablist" aria-activedescendant="" style={{ userSelect: "none" }}>
            {[
              {
                tab: "Primary",
                tabClass: "J-KU-KO",
                iconClass: "aIf-aLf",
                tooltip: "Person-to-person conversations and messages that don't appear in other tabs.",
              },
              {
                tab: "Promotions",
                tabClass: "aJi-aLe aE2",
                iconClass: "aJi-aLf",
                tooltip: "Marketing, interests, social and political causes, and other promotional emails.",
              },
              {
                tab: "Social",
                tabClass: "aKe-aLe",
                iconClass: "aKe-aLf",
                tooltip:
                  "Messages from social networks, media-sharing sites, online dating services, and other social websites.",
              },
              {
                tab: "Updates",
                tabClass: "aH2-aLe aE2",
                iconClass: "aH2-aLf",
                tooltip: "Personal, auto-generated updates including confirmations, receipts, bills, and statements.",
              },
            ].map(({ tab, tabClass, iconClass, tooltip }) => (
              <InboxTab
                key={tab}
                tab={tab}
                isActive={isActiveTab(tab)}
                activeTabClass={activeTabClass}
                onClick={setActiveInboxTab}
                counts={counts}
                previews={previews}
                tabClass={tabClass}
                iconClass={iconClass}
                tooltip={tooltip}
              />
            ))}
          </tr>
          <tr>
            <td className="aKl sf-hidden" colSpan={6}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
