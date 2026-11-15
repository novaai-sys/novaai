/**
 * How Autopilot treats each rating band. Only the 4–5 band can publish on
 * its own (the `autopilot_enabled` column); lower ratings always wait.
 */
export const ruleRows = [
  { id: "high", stars: "4–5", who: "Happy customers", switchable: true },
  { id: "mid", stars: "3", who: "Mixed feelings", switchable: false },
  { id: "low", stars: "1–2", who: "Unhappy customers", switchable: false },
] as const;
