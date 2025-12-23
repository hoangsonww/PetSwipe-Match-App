const AWS = require("aws-sdk");
const https = require("https");

const secretsManager = new AWS.SecretsManager();
const eks = new AWS.EKS();

exports.handler = async (event) => {
  console.log("GitOps Sync Event:", JSON.stringify(event, null, 2));

  try {
    // Get ArgoCD token from Secrets Manager
    const secret = await secretsManager
      .getSecretValue({
        SecretId: process.env.ARGOCD_AUTH_TOKEN,
      })
      .promise();

    const argocdToken = secret.SecretString;
    const argocdServer = process.env.ARGOCD_SERVER;
    const environment = process.env.ENVIRONMENT;

    // Parse the event to determine what triggered the sync
    const eventSource = event.source;
    const detailType = event["detail-type"];

    let applicationName = "petswipe-app";
    let syncReason = "unknown";

    if (eventSource === "aws.ecs") {
      syncReason = "ECS deployment state change";
      applicationName = `petswipe-${environment}`;
    } else if (eventSource === "aws.codepipeline") {
      syncReason = "CodePipeline execution state change";
    }

    console.log(
      `Triggering ArgoCD sync for ${applicationName} due to: ${syncReason}`,
    );

    // Trigger ArgoCD application sync
    const syncResult = await triggerArgocdSync(
      argocdServer,
      argocdToken,
      applicationName,
    );

    console.log("Sync result:", syncResult);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "GitOps sync triggered successfully",
        application: applicationName,
        reason: syncReason,
        syncResult: syncResult,
      }),
    };
  } catch (error) {
    console.error("Error triggering GitOps sync:", error);
    throw error;
  }
};

async function triggerArgocdSync(server, token, appName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: server,
      port: 443,
      path: `/api/v1/applications/${appName}/sync`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(
            new Error(`ArgoCD API returned status ${res.statusCode}: ${data}`),
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    // Send sync request with options
    req.write(
      JSON.stringify({
        prune: true,
        dryRun: false,
        strategy: {
          hook: {
            force: true,
          },
        },
        resources: null,
      }),
    );

    req.end();
  });
}
