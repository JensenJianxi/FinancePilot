import { App } from "aws-cdk-lib";
import { getHostingConfig } from "./config/hosting";
import { getStageConfig, toStackName } from "./config/stages";
import { ApiStack } from "./stacks/api-stack";
import { AuthStack } from "./stacks/auth-stack";
import { DataStack } from "./stacks/data-stack";
import { HostingStack } from "./stacks/hosting-stack";

const app = new App();
const stageConfig = getStageConfig(
  app.node.tryGetContext("stage") ?? process.env.FINANCE_PILOT_CDK_STAGE
);
const hostingConfig = getHostingConfig(stageConfig);

const environment =
  stageConfig.account && stageConfig.region
    ? {
        account: stageConfig.account,
        region: stageConfig.region
      }
    : {
        region: stageConfig.region
      };

new AuthStack(app, toStackName(stageConfig, "Auth"), {
  description: "FinancePilot authentication foundation scaffold.",
  env: environment,
  stageConfig
});

new DataStack(app, toStackName(stageConfig, "Data"), {
  description: "FinancePilot data foundation scaffold.",
  env: environment,
  stageConfig
});

new ApiStack(app, toStackName(stageConfig, "Api"), {
  description: "FinancePilot API foundation scaffold.",
  env: environment,
  stageConfig
});

new HostingStack(app, toStackName(stageConfig, "Hosting"), {
  description: "FinancePilot frontend hosting stack with S3 and CloudFront.",
  env: environment,
  hosting: hostingConfig,
  stageConfig
});
