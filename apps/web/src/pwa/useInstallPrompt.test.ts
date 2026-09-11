import assert from "node:assert/strict";
import test from "node:test";
import { getInstallPromptSnapshot } from "./useInstallPrompt";

test("install prompt snapshot keeps the same reference while its state is unchanged", () => {
  const firstSnapshot = getInstallPromptSnapshot();
  const secondSnapshot = getInstallPromptSnapshot();

  assert.strictEqual(secondSnapshot, firstSnapshot);
});
