import test from "node:test";
import assert from "node:assert/strict";
import { getStageConfig, parseStageName, toStackName } from "./stages";

test("parseStageName defaults to dev for unknown values", () => {
  assert.equal(parseStageName("staging"), "dev");
});

test("getStageConfig creates consistent prefixes", () => {
  const config = getStageConfig("prod", {
    AWS_REGION: "ap-southeast-1",
    CDK_DEFAULT_ACCOUNT: "123456789012"
  });

  assert.equal(config.name, "prod");
  assert.equal(config.resourcePrefix, "financepilot-prod");
  assert.equal(toStackName(config, "Api"), "FinancePilot-prod-Api");
});
