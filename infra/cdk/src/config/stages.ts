export type FinancePilotStage = "dev" | "prod";

export interface FinancePilotStageConfig {
  account?: string;
  name: FinancePilotStage;
  region: string;
  resourcePrefix: string;
  stackPrefix: string;
}

export function parseStageName(rawStage?: string): FinancePilotStage {
  return rawStage === "prod" ? "prod" : "dev";
}

export function getStageConfig(
  rawStage?: string,
  environment: NodeJS.ProcessEnv = process.env
): FinancePilotStageConfig {
  const name = parseStageName(rawStage ?? environment.FINANCE_PILOT_CDK_STAGE);
  const region = environment.CDK_DEFAULT_REGION ?? environment.AWS_REGION ?? "ap-southeast-1";
  const account = environment.CDK_DEFAULT_ACCOUNT;
  const prefix = `financepilot-${name}`;

  return {
    account,
    name,
    region,
    resourcePrefix: prefix,
    stackPrefix: `FinancePilot-${name}`
  };
}

export function toStackName(config: FinancePilotStageConfig, suffix: string) {
  return `${config.stackPrefix}-${suffix}`;
}
