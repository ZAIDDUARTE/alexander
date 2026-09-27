#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { AlexanderPersistenceStack } from "../lib/alexander-persistence-stack";

const app = new App();
new AlexanderPersistenceStack(app, "AlexanderPersistenceStack", {
  description:
    "Private RDS PostgreSQL, RDS Proxy, and S3 submission archive for Alexander onboarding.",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  terminationProtection: true,
});
