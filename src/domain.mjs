import { round, sum, ratio, days, money, metric, notice } from "./lib.mjs";
export const config = {
  slug: "subscription-spend-auditor",
  title: "Subscription Spend Auditor",
  description:
    "Review unused seats and upcoming renewals before more money is committed.",
  scope:
    "A local planning workspace. Review suggestions before acting; no automatic messages or financial transactions.",
  method:
    "Annual costs are divided by 12. Potential savings assume linear seat pricing and only include contracts marked reducible. Review vendor terms and minimum commitments before cancelling; no cancellation is performed.",
  port: 4428,
  asOf: "2026-11-15",
  fields: [
    {
      key: "name",
      label: "Subscription / vendor",
      type: "text",
    },
    {
      key: "billing",
      label: "Billing period",
      type: "select",
      options: ["monthly", "annual"],
    },
    {
      key: "cost",
      label: "Cost per billing period",
      type: "number",
      min: 0,
      max: 100000000,
    },
    {
      key: "seats",
      label: "Paid seats",
      type: "number",
      min: 1,
      max: 100000,
      integer: true,
    },
    {
      key: "activeSeats",
      label: "Seats used in review period",
      type: "number",
      min: 0,
      max: 100000,
      integer: true,
    },
    {
      key: "renewal",
      label: "Next renewal",
      type: "date",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        "communication",
        "design",
        "development",
        "sales",
        "operations",
        "other",
      ],
    },
    {
      key: "cancellable",
      label: "Seats can be reduced at renewal",
      type: "boolean",
    },
  ],
  settings: [
    {
      key: "currency",
      label: "Currency code (one currency per workspace)",
      type: "text",
      maxLength: 3,
    },
    {
      key: "windowDays",
      label: "Renewal review window (days)",
      type: "number",
      min: 0,
      max: 365,
      integer: true,
    },
  ],
  actions: [],
  document: false,
};
config.validate = function validate(records) {
  for (const r of records)
    if (r.activeSeats > r.seats)
      throw new Error("Active seats cannot exceed paid seats");
};
export const example = {
  schemaVersion: 1,
  project: "subscription-spend-auditor",
  settings: {
    currency: "USD",
    windowDays: 30,
  },
  records: [
    {
      id: "sub-1",
      name: "Example CRM",
      billing: "monthly",
      cost: 200,
      seats: 10,
      activeSeats: 6,
      renewal: "2026-11-25",
      category: "sales",
      cancellable: true,
    },
    {
      id: "sub-2",
      name: "Example Design",
      billing: "annual",
      cost: 1200,
      seats: 5,
      activeSeats: 5,
      renewal: "2027-01-01",
      category: "design",
      cancellable: true,
    },
  ],
};
export function analyze(records, s, asOf) {
  const monthly = (r) => r.cost / (r.billing === "annual" ? 12 : 1),
    saving = (r) =>
      r.cancellable ? (monthly(r) * (r.seats - r.activeSeats)) / r.seats : 0;
  return {
    metrics: [
      metric(
        "Monthly equivalent spend",
        money(sum(records.map(monthly))),
        s.currency,
      ),
      metric(
        "Potential monthly seat savings",
        money(sum(records.map(saving))),
        s.currency,
      ),
      metric(
        "Renewals to review",
        records.filter((r) => days(r.renewal, asOf) <= s.windowDays).length,
      ),
    ],
    notices: records
      .filter((r, i) =>
        records.some((q, j) => j < i && q.category === r.category),
      )
      .map((r) =>
        notice(
          r.id,
          `${r.name}: another subscription shares this category; check whether the tools overlap.`,
        ),
      ),
    columns: [
      "Vendor",
      "Monthly equivalent",
      "Unused seats",
      "Potential savings / month",
      "Renewal",
    ],
    rows: records.map((r) => ({
      id: r.id,
      Vendor: r.name,
      "Monthly equivalent": money(monthly(r)),
      "Unused seats": r.seats - r.activeSeats,
      "Potential savings / month": money(saving(r)),
      Renewal: r.renewal,
    })),
  };
}
