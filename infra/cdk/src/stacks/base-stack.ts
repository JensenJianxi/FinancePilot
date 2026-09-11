import { Stack, Tags, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import type { FinancePilotStageConfig } from "../config/stages";

export interface FinancePilotStackProps extends StackProps {
  stageConfig: FinancePilotStageConfig;
}

export abstract class FinancePilotBaseStack extends Stack {
  protected constructor(scope: Construct, id: string, props: FinancePilotStackProps) {
    super(scope, id, props);

    Tags.of(this).add("Application", "FinancePilot");
    Tags.of(this).add("Stage", props.stageConfig.name);
  }
}
