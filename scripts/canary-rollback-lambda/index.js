/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Automated Canary Rollback Lambda Function
 * Triggered by CloudWatch alarms to automatically rollback failed deployments
 * ═══════════════════════════════════════════════════════════════════════════
 */

const AWS = require("aws-sdk");

const elbv2 = new AWS.ELBv2();
const ecs = new AWS.ECS();
const sns = new AWS.SNS();

// Environment variables
const CLUSTER_NAME = process.env.CLUSTER_NAME;
const CANARY_SERVICE_NAME = process.env.CANARY_SERVICE_NAME;
const LISTENER_RULE_ARN = process.env.LISTENER_RULE_ARN;
const BLUE_TG_ARN = process.env.BLUE_TG_ARN;
const CANARY_TG_ARN = process.env.CANARY_TG_ARN;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("Canary Rollback Lambda triggered");
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Parse SNS message
    const message = JSON.parse(event.Records[0].Sns.Message);
    const alarmName = message.AlarmName;
    const alarmState = message.NewStateValue;
    const alarmReason = message.NewStateReason;

    console.log(`Alarm: ${alarmName}`);
    console.log(`State: ${alarmState}`);
    console.log(`Reason: ${alarmReason}`);

    // Only proceed if alarm is in ALARM state
    if (alarmState !== "ALARM") {
      console.log("Alarm is not in ALARM state, skipping rollback");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No action needed" }),
      };
    }

    // Step 1: Set traffic to 100% blue, 0% canary
    console.log("Step 1: Reverting traffic to 100% blue...");
    await revertTraffic();

    // Step 2: Scale down canary service
    console.log("Step 2: Scaling down canary service...");
    await scaleDownCanary();

    // Step 3: Send notification
    console.log("Step 3: Sending rollback notification...");
    await sendNotification(alarmName, alarmReason);

    console.log("Canary rollback completed successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Canary rollback completed",
        alarm: alarmName,
        reason: alarmReason,
      }),
    };
  } catch (error) {
    console.error("Error during canary rollback:", error);

    // Send error notification
    await sendErrorNotification(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Canary rollback failed",
        error: error.message,
      }),
    };
  }
};

/**
 * Revert traffic to 100% blue environment
 */
async function revertTraffic() {
  const params = {
    RuleArn: LISTENER_RULE_ARN,
    Actions: [
      {
        Type: "forward",
        ForwardConfig: {
          TargetGroups: [
            {
              TargetGroupArn: BLUE_TG_ARN,
              Weight: 100,
            },
            {
              TargetGroupArn: CANARY_TG_ARN,
              Weight: 0,
            },
          ],
          TargetGroupStickinessConfig: {
            Enabled: true,
            DurationSeconds: 3600,
          },
        },
      },
    ],
  };

  try {
    await elbv2.modifyRule(params).promise();
    console.log("Traffic reverted to 100% blue");
  } catch (error) {
    console.error("Error reverting traffic:", error);
    throw error;
  }
}

/**
 * Scale down canary service to 0
 */
async function scaleDownCanary() {
  const params = {
    cluster: CLUSTER_NAME,
    service: CANARY_SERVICE_NAME,
    desiredCount: 0,
  };

  try {
    await ecs.updateService(params).promise();
    console.log("Canary service scaled down to 0");
  } catch (error) {
    console.error("Error scaling down canary:", error);
    throw error;
  }
}

/**
 * Send rollback notification
 */
async function sendNotification(alarmName, alarmReason) {
  const message = `
🚨 CANARY DEPLOYMENT ROLLBACK

Alarm: ${alarmName}
Reason: ${alarmReason}

Action Taken:
✓ Traffic reverted to 100% blue environment
✓ Canary service scaled down to 0

Status: Rollback completed successfully

Timestamp: ${new Date().toISOString()}
  `.trim();

  const params = {
    TopicArn: SNS_TOPIC_ARN,
    Subject: "🚨 Canary Deployment Rolled Back",
    Message: message,
  };

  try {
    await sns.publish(params).promise();
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
    // Don't throw - notification failure shouldn't fail the rollback
  }
}

/**
 * Send error notification
 */
async function sendErrorNotification(error) {
  const message = `
❌ CANARY ROLLBACK FAILED

Error: ${error.message}

Stack Trace:
${error.stack}

Manual intervention required!

Timestamp: ${new Date().toISOString()}
  `.trim();

  const params = {
    TopicArn: SNS_TOPIC_ARN,
    Subject: "❌ Canary Rollback Failed - Manual Intervention Required",
    Message: message,
  };

  try {
    await sns.publish(params).promise();
  } catch (notificationError) {
    console.error("Error sending error notification:", notificationError);
  }
}
