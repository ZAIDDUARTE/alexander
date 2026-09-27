import path from "node:path";
import {
  CfnOutput,
  CustomResource,
  Duration,
  RemovalPolicy,
  Stack,
  Tags,
  type StackProps,
} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, type NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

const INFRA_ROOT = path.join(__dirname, "..");

/**
 * Cost-sensitive MVP:
 * - db.t4g.micro, single-AZ, 20 GiB gp3
 * - no NAT gateway; one-AZ interface endpoints for Secrets Manager, KMS, and logs
 * - RDS Proxy is required for Lambda pooling and is the main fixed database cost
 * Multi-AZ and a second endpoint AZ can be added later without making the database public.
 */
export class AlexanderPersistenceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const teamSlug = this.node.tryGetContext("vercelTeamSlug") ?? "zaid-alis-projects";
    const projectName = this.node.tryGetContext("vercelProjectName") ?? "alexander";
    const postgresVersion = rds.PostgresEngineVersion.of("16.15", "16");

    Tags.of(this).add("Project", "alexander");
    Tags.of(this).add("ManagedBy", "cdk");

    const key = new kms.Key(this, "DataKey", {
      alias: "alias/alexander-onboarding",
      description: "Alexander onboarding RDS, secrets, and submission archive",
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.42.0.0/16"),
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const lambdaAz = vpc.availabilityZones[0];
    const lambdaSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      availabilityZones: [lambdaAz],
    });

    vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
    });

    const lambdaSg = new ec2.SecurityGroup(this, "PersistenceLambdaSg", {
      vpc,
      description: "Alexander persistence Lambda",
      allowAllOutbound: false,
    });
    const migrationSg = new ec2.SecurityGroup(this, "MigrationLambdaSg", {
      vpc,
      description: "Alexander schema migration Lambda",
      allowAllOutbound: false,
    });
    const proxySg = new ec2.SecurityGroup(this, "ProxySg", {
      vpc,
      description: "Alexander RDS Proxy",
      allowAllOutbound: false,
    });
    const databaseSg = new ec2.SecurityGroup(this, "DatabaseSg", {
      vpc,
      description: "Alexander RDS PostgreSQL",
      allowAllOutbound: false,
    });
    const endpointSg = new ec2.SecurityGroup(this, "AwsEndpointSg", {
      vpc,
      description: "HTTPS from Alexander Lambdas to AWS API endpoints",
      allowAllOutbound: false,
    });

    proxySg.addIngressRule(lambdaSg, ec2.Port.tcp(5432), "Persistence Lambda to RDS Proxy");
    proxySg.addEgressRule(databaseSg, ec2.Port.tcp(5432), "RDS Proxy to PostgreSQL");
    databaseSg.addIngressRule(proxySg, ec2.Port.tcp(5432), "PostgreSQL from RDS Proxy only");
    databaseSg.addIngressRule(migrationSg, ec2.Port.tcp(5432), "PostgreSQL from migration Lambda");
    endpointSg.addIngressRule(lambdaSg, ec2.Port.tcp(443), "Persistence Lambda to AWS APIs");
    endpointSg.addIngressRule(migrationSg, ec2.Port.tcp(443), "Migration Lambda to AWS APIs");
    lambdaSg.addEgressRule(proxySg, ec2.Port.tcp(5432), "Persistence Lambda to RDS Proxy");
    lambdaSg.addEgressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(443), "Interface endpoints");
    migrationSg.addEgressRule(databaseSg, ec2.Port.tcp(5432), "Migration Lambda to PostgreSQL");
    migrationSg.addEgressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(443), "Interface endpoints");
    const s3Prefix = ec2.PrefixList.fromLookup(this, "S3Prefix", {
      prefixListName: "com.amazonaws.us-east-1.s3",
    });
    lambdaSg.addEgressRule(s3Prefix, ec2.Port.tcp(443), "S3 gateway endpoint");

    const endpointServices = [
      ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      ec2.InterfaceVpcEndpointAwsService.KMS,
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    ];
    for (const service of endpointServices) {
      vpc.addInterfaceEndpoint(`Endpoint${service.shortName}`, {
        service,
        securityGroups: [endpointSg],
        subnets: lambdaSubnets,
        privateDnsEnabled: true,
      });
    }

    const bucket = new s3.Bucket(this, "SubmissionArchive", {
      bucketName: `alexander-onboarding-submissions-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      bucketKeyEnabled: true,
      versioned: true,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const masterSecret = new secretsmanager.Secret(this, "MasterSecret", {
      description: "Alexander RDS master credentials. Not used by the application after bootstrap.",
      removalPolicy: RemovalPolicy.RETAIN,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "alexander_admin" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 32,
      },
    });
    const appSecret = new secretsmanager.Secret(this, "AppSecret", {
      description: "Alexander application database credentials used by the persistence Lambda.",
      removalPolicy: RemovalPolicy.RETAIN,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "alexander_app" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    const database = new rds.DatabaseInstance(this, "Database", {
      instanceIdentifier: "alexander-onboarding",
      engine: rds.DatabaseInstanceEngine.postgres({ version: postgresVersion }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      availabilityZone: lambdaAz,
      securityGroups: [databaseSg],
      credentials: rds.Credentials.fromSecret(masterSecret),
      databaseName: "alexander",
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncryptionKey: key,
      publiclyAccessible: false,
      multiAz: false,
      backupRetention: Duration.days(7),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoMinorVersionUpgrade: true,
      allowMajorVersionUpgrade: false,
      copyTagsToSnapshot: true,
      iamAuthentication: false,
      enablePerformanceInsights: false,
      parameterGroup: new rds.ParameterGroup(this, "Parameters", {
        engine: rds.DatabaseInstanceEngine.postgres({ version: postgresVersion }),
        parameters: { "rds.force_ssl": "1" },
      }),
    });

    const migrationLogs = new logs.LogGroup(this, "MigrationLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const migrationFn = this.lambda("MigrationFn", path.join(INFRA_ROOT, "lambda/migrate.ts"), {
      vpc,
      vpcSubnets: lambdaSubnets,
      securityGroups: [migrationSg],
      timeout: Duration.minutes(5),
      memorySize: 256,
      logGroup: migrationLogs,
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: "alexander",
        MASTER_SECRET_ARN: masterSecret.secretArn,
        APP_SECRET_ARN: appSecret.secretArn,
      },
      bundlingExtra: [
        `cp ${path.join(INFRA_ROOT, "sql/001_onboarding_storage.sql")} $OUTPUT/001_onboarding_storage.sql`,
      ],
    });
    masterSecret.grantRead(migrationFn);
    appSecret.grantRead(migrationFn);

    const migration = new cr.Provider(this, "MigrationProvider", {
      onEventHandler: migrationFn,
    });
    const schema = new CustomResource(this, "SchemaMigration", {
      serviceToken: migration.serviceToken,
      properties: {
        migrationVersion: "001",
        databaseAddress: database.dbInstanceEndpointAddress,
      },
      resourceType: "Custom::AlexanderSchema",
    });
    schema.node.addDependency(database);

    const proxy = new rds.DatabaseProxy(this, "Proxy", {
      dbProxyName: "alexander-onboarding-proxy",
      proxyTarget: rds.ProxyTarget.fromInstance(database),
      secrets: [appSecret],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [proxySg],
      requireTLS: true,
      iamAuth: false,
    });

    const persistenceLogs = new logs.LogGroup(this, "PersistenceLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const persistenceFn = this.lambda("PersistenceFn", path.join(INFRA_ROOT, "lambda/handler.ts"), {
      vpc,
      vpcSubnets: lambdaSubnets,
      securityGroups: [lambdaSg],
      timeout: Duration.seconds(30),
      memorySize: 256,
      logGroup: persistenceLogs,
      environment: {
        DB_PROXY_HOST: proxy.endpoint,
        DB_PORT: "5432",
        DB_NAME: "alexander",
        APP_SECRET_ARN: appSecret.secretArn,
        SNAPSHOT_BUCKET: bucket.bucketName,
        SNAPSHOT_KMS_KEY_ARN: key.keyArn,
      },
    });
    appSecret.grantRead(persistenceFn);
    key.grantEncryptDecrypt(persistenceFn);
    bucket.grantPut(persistenceFn, "onboarding/*");
    bucket.grantRead(persistenceFn, "onboarding/*");
    persistenceFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [bucket.bucketArn],
      }),
    );

    const oidc = new iam.OpenIdConnectProvider(this, "VercelOidc", {
      url: `https://oidc.vercel.com/${teamSlug}`,
      clientIds: [`https://vercel.com/${teamSlug}`],
    });
    const vercelRole = new iam.Role(this, "VercelPersistenceRole", {
      roleName: "alexander-vercel-persistence",
      assumedBy: new iam.WebIdentityPrincipal(oidc.openIdConnectProviderArn, {
        StringEquals: {
          [`oidc.vercel.com/${teamSlug}:aud`]: `https://vercel.com/${teamSlug}`,
          [`oidc.vercel.com/${teamSlug}:sub`]: `owner:${teamSlug}:project:${projectName}:environment:production`,
        },
      }),
      description: "Vercel production functions may invoke only the Alexander persistence Lambda",
    });
    vercelRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [persistenceFn.functionArn],
      }),
    );

    new CfnOutput(this, "Region", { value: this.region });
    new CfnOutput(this, "PersistenceLambdaArn", { value: persistenceFn.functionArn });
    new CfnOutput(this, "VercelRoleArn", { value: vercelRole.roleArn });
    new CfnOutput(this, "SubmissionBucketName", { value: bucket.bucketName });
    new CfnOutput(this, "RdsIdentifier", { value: database.instanceIdentifier });
    new CfnOutput(this, "ProxyIdentifier", { value: proxy.dbProxyName });
  }

  private lambda(
    id: string,
    entry: string,
    options: {
      vpc: ec2.IVpc;
      vpcSubnets: ec2.SubnetSelection;
      securityGroups: ec2.ISecurityGroup[];
      timeout: Duration;
      memorySize: number;
      logGroup: logs.ILogGroup;
      environment: Record<string, string>;
      bundlingExtra?: string[];
    },
  ): NodejsFunction {
    const extra = options.bundlingExtra ?? [];
    const props: NodejsFunctionProps = {
      functionName: id === "PersistenceFn" ? "alexander-onboarding-persistence" : "alexander-onboarding-migrate",
      entry,
      projectRoot: INFRA_ROOT,
      depsLockFilePath: path.join(INFRA_ROOT, "package-lock.json"),
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: options.timeout,
      memorySize: options.memorySize,
      vpc: options.vpc,
      vpcSubnets: options.vpcSubnets,
      securityGroups: options.securityGroups,
      environment: options.environment,
      logGroup: options.logGroup,
      bundling: {
        externalModules: ["@aws-sdk/*"],
        nodeModules: ["pg"],
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (_input, output) => [
            `cp ${path.join(INFRA_ROOT, "lambda/global-bundle.pem")} ${output}/global-bundle.pem`,
            ...extra.map((command) => command.replace("$OUTPUT", output)),
          ],
        },
      },
    };
    return new NodejsFunction(this, id, props);
  }
}
