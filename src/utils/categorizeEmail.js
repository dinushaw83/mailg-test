export const CATEGORIES = {
    Promotions: "Promotions",
    Social: "Social",
    Updates: "Updates",
    Primary: "Primary",
};

export default function categorizeEmail(email) {
    const { from = "", subject = "", body = "" } = email;
    const text = `${from} ${subject} ${body}`.toLowerCase();

    const score = {
        Promotions: 0,
        Social: 0,
        Updates: 0,
        Primary: 0,
    };

    // --- Promotions ---
    if (/unsubscribe|view in browser|% off|sale|deal|discount|offer|flash sale|special fares|travel|airlines|amazon/.test(text))
        score.Promotions += 3;
    if (/@promo|@offers|@news|@newsletter|@marketing/.test(from))
        score.Promotions += 3;

    // --- Social ---
    if (/facebook|twitter|instagram|linkedin|tiktok|snapchat/.test(text))
        score.Social += 4;
    if (/friend request|liked your|follow(ed)? you|invitation/.test(text))
        score.Social += 2;

    // --- Updates (transactional/notifications) ---
    if (/invoice|receipt|payment|transaction|order|tracking|shipped|delivered|confirmation/.test(text))
        score.Updates += 4;
    if (/statement|account alert|billing/.test(text))
        score.Updates += 3;
    // Catch things like [GitHub], [Jira] style
    if (/^\[.+\]/.test(subject))
        score.Updates += 2;

    // --- Primary (default fallback) ---
    if (/gmail\.com|yahoo\.com|outlook\.com/.test(from)) score.Primary += 1;
    if (!Object.values(score).some((v) => v > 0)) score.Primary += 5;

    // --- Decide final category ---
    let category = "Primary";
    let maxScore = 0;
    for (const [key, value] of Object.entries(score)) {
        if (value > maxScore) {
            category = key;
            maxScore = value;
        }
    }

    return category;
}
