import test from "node:test";
import assert from "node:assert/strict";
import { config, example, analyze } from "../src/domain.mjs";
import { validateState } from "../src/lib.mjs";
test("Documented sample results match independently specified expectations", () => {
  const report = analyze(example.records, example.settings, config.asOf);
  for (const [label, value] of [
    ["Monthly equivalent spend", "300.00"],
    ["Potential monthly seat savings", "80.00"],
    ["Renewals to review", 1],
  ])
    assert.equal(
      report.metrics.find((m) => m.label === label).value,
      value,
      label,
    );
});
test("Business edge cases", () => {
  (function edge(records, s, analyze, validate) {
    assert.equal(
      analyze([{ ...records[0], cancellable: false }], s, "2026-11-15")
        .metrics[1].value,
      "0.00",
    );
    assert.throws(
      () =>
        validate(
          { ...example, records: [{ ...records[0], activeSeats: 11 }] },
          config,
        ),
      /Active seats/,
    );
  })(example.records, example.settings, analyze, validateState);
});
