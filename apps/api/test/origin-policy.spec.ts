import assert from "node:assert/strict";
import { test } from "node:test";
import { isTrustedBrowserOrigin } from "../src/auth/origin-policy";

test("accepts only the configured browser origin for cookie-backed auth", () => {
  assert.equal(
    isTrustedBrowserOrigin(
      "https://app.tpservicos.example",
      "https://app.tpservicos.example",
    ),
    true,
  );
  assert.equal(
    isTrustedBrowserOrigin(
      "https://app.tpservicos.example/",
      "https://app.tpservicos.example",
    ),
    true,
  );
  assert.equal(
    isTrustedBrowserOrigin(
      "https://evil.example",
      "https://app.tpservicos.example",
    ),
    false,
  );
  assert.equal(
    isTrustedBrowserOrigin(undefined, "https://app.tpservicos.example"),
    false,
  );
});
