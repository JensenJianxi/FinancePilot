import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type { Construct } from "constructs";
import { FinancePilotBaseStack, type FinancePilotStackProps } from "./base-stack";

export class DataStack extends FinancePilotBaseStack {
  constructor(scope: Construct, id: string, props: FinancePilotStackProps) {
    super(scope, id, props);

    const settingsTable = new dynamodb.Table(this, "SettingsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.stageConfig.name === "prod"
      },
      removalPolicy:
        props.stageConfig.name === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      tableName: "FinancePilotSettings"
    });

    new CfnOutput(this, "SettingsTableName", {
      value: settingsTable.tableName
    });

    const subscriptionsTable = new dynamodb.Table(this, "SubscriptionsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.stageConfig.name === "prod"
      },
      removalPolicy:
        props.stageConfig.name === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      sortKey: {
        name: "subscriptionId",
        type: dynamodb.AttributeType.STRING
      },
      tableName: "FinancePilotSubscriptions"
    });

    new CfnOutput(this, "SubscriptionsTableName", {
      value: subscriptionsTable.tableName
    });

    const savingsGoalsTable = new dynamodb.Table(this, "SavingsGoalsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.stageConfig.name === "prod"
      },
      removalPolicy:
        props.stageConfig.name === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      sortKey: {
        name: "goalId",
        type: dynamodb.AttributeType.STRING
      },
      tableName: "FinancePilotSavingsGoals"
    });

    new CfnOutput(this, "SavingsGoalsTableName", {
      value: savingsGoalsTable.tableName
    });

    const financialHealthScoresTable = new dynamodb.Table(this, "FinancialHealthScoresTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.stageConfig.name === "prod"
      },
      removalPolicy:
        props.stageConfig.name === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      sortKey: {
        name: "scoreId",
        type: dynamodb.AttributeType.STRING
      },
      tableName: "FinancePilotFinancialHealthScores"
    });

    new CfnOutput(this, "FinancialHealthScoresTableName", {
      value: financialHealthScoresTable.tableName
    });

  }
}
