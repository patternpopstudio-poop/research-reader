export const LIBRARY_PLAN = {
  name: "Research library",
  amountCents: 799,
  currency: "usd",
  interval: "month" as const,
  priceLabel: "$7.99",
  cadenceLabel: "per month",
  summary:
    "One monthly subscription opens the practice research library. It covers every published document, plus papers released while the subscription is active.",
  checkoutDescription:
    "Monthly access to the research library, including current documents and papers published during the subscription.",
  includes: [
    {
      title: "The full published library",
      detail: "Read every research document and clinical guide currently published by the practice.",
    },
    {
      title: "New papers while you are subscribed",
      detail: "Documents published during a paid month are included. You do not buy each title separately.",
    },
    {
      title: "Secure in-browser reader",
      detail: "Open pages in the viewer. There is no download, copy, or print.",
    },
    {
      title: "Sign in from any browser",
      detail: "Use your email and password to open the library on the device you are using.",
    },
    {
      title: "Access for each paid month",
      detail: "The subscription is billed monthly. Reading access covers that paid month.",
    },
  ],
} as const;
