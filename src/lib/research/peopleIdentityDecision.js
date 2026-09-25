export const PEOPLE_IDENTITY_ACTIONS = Object.freeze({
  PRESERVE_SEPARATE: Object.freeze({ key: "PRESERVE_SEPARATE", label: "לשמור נפרד", outreach: false }),
  REVIEW_EXISTING_ACCOUNT_LINK: Object.freeze({ key: "REVIEW_EXISTING_ACCOUNT_LINK", label: "בדיקת חיבור לחשבון קיים", outreach: false }),
  INVITE_TO_CLAIM: Object.freeze({ key: "INVITE_TO_CLAIM", label: "מועמד להזמנת Claim", outreach: true }),
  REVIEW_COLLISIONS_THEN_INVITE: Object.freeze({ key: "REVIEW_COLLISIONS_THEN_INVITE", label: "בדיקת כפילויות לפני הזמנה", outreach: false }),
  PRESERVE_UNCLAIMED: Object.freeze({ key: "PRESERVE_UNCLAIMED", label: "לשמור כלא־נתבע", outreach: false }),
  NO_OUTREACH: Object.freeze({ key: "NO_OUTREACH", label: "לא לפנות", outreach: false }),
  ARCHIVE_ONLY: Object.freeze({ key: "ARCHIVE_ONLY", label: "ארכיון בלבד", outreach: false }),
  HUMAN_REVIEW: Object.freeze({ key: "HUMAN_REVIEW", label: "בדיקה אנושית", outreach: false }),
});

export function planPeopleIdentityAction(row, { preserveSeparate = false } = {}) {
  if (preserveSeparate) {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.PRESERVE_SEPARATE,
      reason: "Human Gate קבע שהחשבונות נשארים נפרדים.",
      requiresHumanGate: true,
    });
  }

  if (row?.siteAccountMatch) {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.REVIEW_EXISTING_ACCOUNT_LINK,
      reason: "יש התאמת חשבון אתר. חיבור היסטוריה דורש Claim מאומת; אין חיבור אוטומטי.",
      requiresHumanGate: false,
    });
  }

  if (row?.emailVerified && row?.identityState === "VERIFIED_UNIQUE_ANCHOR") {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.INVITE_TO_CLAIM,
      reason: "עוגן מייל מקור מאומת, ללא חשבון אתר וללא התנגשות שם ידועה.",
      requiresHumanGate: false,
    });
  }

  if (row?.emailVerified && row?.identityState === "VERIFIED_PRIMARY_WITH_COLLISION_TAIL") {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.REVIEW_COLLISIONS_THEN_INVITE,
      reason: "המייל של העוגן מאומת, אך קיימות זהויות נוספות תחת אותו שם. קודם מפרידים זנב/התחזות.",
      requiresHumanGate: true,
    });
  }

  if (!row?.emailVerified && row?.identityState === "LONG_LIVED_UNVERIFIED") {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.PRESERVE_UNCLAIMED,
      reason: "זהות היסטורית בעלת ערך, אך אין כתובת מקור מאומתת שאפשר לבסס עליה Claim.",
      requiresHumanGate: false,
    });
  }

  if (row?.identityState === "HIGH_BLOCK_NOISE") {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.NO_OUTREACH,
      reason: "רמת חסימות גבוהה. נשמר provenance; אין outreach.",
      requiresHumanGate: false,
    });
  }

  if (row?.identityState === "ONE_DAY_THIN") {
    return Object.freeze({
      ...PEOPLE_IDENTITY_ACTIONS.ARCHIVE_ONLY,
      reason: "זהות דקה וקצרת־חיים. אין מספיק ראיה לקישור או לפנייה.",
      requiresHumanGate: false,
    });
  }

  return Object.freeze({
    ...PEOPLE_IDENTITY_ACTIONS.HUMAN_REVIEW,
    reason: row?.emailVerified
      ? "יש ראיית מייל, אך מצב הזהות עדיין אינו מספיק לפעולה."
      : "מייל לא־מאומת אינו ראיית זהות ואסור להשתמש בו להזמנה.",
    requiresHumanGate: true,
  });
}

export function maySendHistoricalClaimInvite(row, options) {
  return planPeopleIdentityAction(row, options).outreach === true;
}
