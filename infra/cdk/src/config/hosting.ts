import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FinancePilotStageConfig } from "./stages";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const defaultBuildDirectory = resolve(currentDirectory, "../../../../apps/web/dist");

export interface HostingConfig {
  certificateArn?: string;
  distPath: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  siteDomain?: string;
  siteUrl: string;
}

export function getHostingConfig(
  stageConfig: FinancePilotStageConfig,
  environment: NodeJS.ProcessEnv = process.env
): HostingConfig {
  const siteUrl = environment.FINANCE_PILOT_SITE_URL ?? `https://${stageConfig.resourcePrefix}.example.com`;

  return {
    certificateArn: environment.FINANCE_PILOT_CERTIFICATE_ARN,
    distPath: defaultBuildDirectory,
    hostedZoneId: environment.FINANCE_PILOT_HOSTED_ZONE_ID,
    hostedZoneName: environment.FINANCE_PILOT_HOSTED_ZONE_NAME,
    siteDomain: environment.FINANCE_PILOT_WEB_DOMAIN,
    siteUrl
  };
}
