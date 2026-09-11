import { existsSync } from "node:fs";
import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import { BucketDeployment, Source, CacheControl } from "aws-cdk-lib/aws-s3-deployment";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import type { HostingConfig } from "../config/hosting";
import { FinancePilotBaseStack, type FinancePilotStackProps } from "./base-stack";

export interface HostingStackProps extends FinancePilotStackProps {
  hosting: HostingConfig;
}

export class HostingStack extends FinancePilotBaseStack {
  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    const accessLogsBucket = new s3.Bucket(this, "WebAccessLogsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy:
        props.stageConfig.name === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stageConfig.name !== "prod"
    });

    const websiteBucket = new s3.Bucket(this, "WebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy:
        props.stageConfig.name === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stageConfig.name !== "prod",
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: "s3-access/"
    });

    const securityHeadersPolicy = new ResponseHeadersPolicy(this, "SecurityHeadersPolicy", {
      comment: "FinancePilot frontend security headers",
      customHeadersBehavior: {
        customHeaders: [
          {
            header: "Content-Security-Policy",
            override: true,
            value:
              "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; manifest-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
          },
          {
            header: "Permissions-Policy",
            override: true,
            value:
              "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
          }
        ]
      },
      securityHeadersBehavior: {
        contentTypeOptions: {
          override: true
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true
        },
        referrerPolicy: {
          referrerPolicy:
            cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          override: true,
          preload: true
        },
        xssProtection: {
          modeBlock: true,
          override: true,
          protection: true
        }
      }
    });

    const htmlCachePolicy = new CachePolicy(this, "HtmlCachePolicy", {
      comment: "No-cache policy for FinancePilot HTML shell and mutable metadata files",
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.minutes(5),
      minTtl: Duration.seconds(0)
    });

    const staticAssetCachePolicy = new CachePolicy(this, "StaticAssetCachePolicy", {
      comment: "Revalidation policy for FinancePilot assets with stable filenames",
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.minutes(5),
      minTtl: Duration.seconds(0)
    });

    const certificate =
      props.hosting.certificateArn && props.hosting.siteDomain
        ? acm.Certificate.fromCertificateArn(
            this,
            "ImportedCertificate",
            props.hosting.certificateArn
          )
        : undefined;

    const distribution = new Distribution(this, "WebDistribution", {
      certificate,
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: htmlCachePolicy,
        compress: true,
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        responseHeadersPolicy: securityHeadersPolicy,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: "index.html",
      domainNames: certificate && props.hosting.siteDomain ? [props.hosting.siteDomain] : undefined,
      enableLogging: true,
      logBucket: accessLogsBucket,
      logFilePrefix: "cloudfront/",
      additionalBehaviors: {
        "assets/*": {
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: staticAssetCachePolicy,
          compress: true,
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          responseHeadersPolicy: securityHeadersPolicy,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        },
        "sw.js": {
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: htmlCachePolicy,
          compress: true,
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          responseHeadersPolicy: securityHeadersPolicy,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.seconds(0)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.seconds(0)
        }
      ]
    });

    if (
      certificate &&
      props.hosting.siteDomain &&
      props.hosting.hostedZoneName &&
      props.hosting.hostedZoneId
    ) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
        hostedZoneId: props.hosting.hostedZoneId,
        zoneName: props.hosting.hostedZoneName
      });

      new route53.ARecord(this, "WebAliasRecord", {
        recordName: props.hosting.siteDomain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        zone: hostedZone
      });

      new route53.AaaaRecord(this, "WebAliasRecordIpv6", {
        recordName: props.hosting.siteDomain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        zone: hostedZone
      });
    }

    if (existsSync(props.hosting.distPath)) {
      new BucketDeployment(this, "DeployFrontendShell", {
        cacheControl: [CacheControl.noCache(), CacheControl.noStore(), CacheControl.mustRevalidate()],
        destinationBucket: websiteBucket,
        distribution,
        distributionPaths: ["/index.html", "/favicon.svg", "/apple-touch-icon.svg", "/robots.txt", "/sitemap.xml", "/site.webmanifest", "/sw.js"],
        prune: false,
        sources: [
          Source.asset(props.hosting.distPath, {
            exclude: ["assets/*"]
          })
        ]
      });

      new BucketDeployment(this, "DeployFrontendAssets", {
        cacheControl: [CacheControl.noCache(), CacheControl.mustRevalidate()],
        destinationBucket: websiteBucket,
        distribution,
        distributionPaths: ["/assets/*"],
        prune: false,
        sources: [
          Source.asset(props.hosting.distPath, {
            exclude: [
              "index.html",
              "favicon.svg",
              "apple-touch-icon.svg",
              "robots.txt",
              "sitemap.xml",
              "site.webmanifest",
              "sw.js"
            ]
          })
        ]
      });
    } else {
      new CfnOutput(this, "FrontendBuildArtifactsMissing", {
        value: `Frontend build directory not found at ${props.hosting.distPath}. Run pnpm build before deployment.`
      });
    }

    new CfnOutput(this, "WebBucketName", {
      value: websiteBucket.bucketName
    });

    new CfnOutput(this, "DistributionDomainName", {
      value: distribution.domainName
    });
  }
}
