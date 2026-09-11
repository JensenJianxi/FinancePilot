import type { Construct } from "constructs";
import { FinancePilotBaseStack, type FinancePilotStackProps } from "./base-stack";

export class AuthStack extends FinancePilotBaseStack {
  constructor(scope: Construct, id: string, props: FinancePilotStackProps) {
    super(scope, id, props);
  }
}
