import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

if (typeof window !== "undefined") {
  throw new Error("aws-persistence is server-only");
}

export type LambdaInvokeResult = {
  ok: boolean;
  statusCode: number;
  payload: unknown;
};

function requiredEnv(name: "AWS_REGION" | "AWS_ROLE_ARN" | "ALEXANDER_PERSISTENCE_LAMBDA_ARN"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error("aws_persistence_not_configured");
  }
  return value;
}

let client: LambdaClient | null = null;

function lambdaClient(): LambdaClient {
  if (!client) {
    client = new LambdaClient({
      region: requiredEnv("AWS_REGION"),
      credentials: awsCredentialsProvider({
        roleArn: requiredEnv("AWS_ROLE_ARN"),
      }),
    });
  }
  return client;
}

export async function invokePersistenceLambda(operation: unknown): Promise<LambdaInvokeResult> {
  const response = await lambdaClient().send(
    new InvokeCommand({
      FunctionName: requiredEnv("ALEXANDER_PERSISTENCE_LAMBDA_ARN"),
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(operation)),
    }),
  );
  const raw = response.Payload ? Buffer.from(response.Payload).toString("utf8") : "";
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = null;
    }
  }
  if (response.FunctionError) {
    return { ok: false, statusCode: response.StatusCode ?? 500, payload: { ok: false, reason: "database_failed" } };
  }
  const body = payload && typeof payload === "object" ? (payload as { ok?: boolean }) : null;
  return {
    ok: body?.ok === true,
    statusCode: response.StatusCode ?? 200,
    payload,
  };
}
