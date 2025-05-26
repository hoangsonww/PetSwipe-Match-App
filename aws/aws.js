#!/usr/bin/env node

/**
 * Petswipe AWS CLI Helpers
 *
 * Adds commands to the PetSwipe CLI for AWS provisioning,
 * deployment, and log streaming.
 *
 * Usage (after adding to your Commander setup or calling directly):
 *   petswipe aws:alb       # run aws-alb.sh
 *   petswipe aws:deploy    # run aws/deploy.sh
 *   petswipe aws:logs      # tail logs from your backend service
 *
 * @author Son Nguyen
 * @license MIT
 * @version 1.0.0
 * @date 2025-05-26
 */

const { program } = require("commander");
const { spawnSync, spawn } = require("child_process");

program
  .command("aws:alb")
  .description("Create or update your Application Load Balancer")
  .action(() => {
    console.log("→ Provisioning ALB + Target Group + Listener…");
    const res = spawnSync("bash", ["aws-alb.sh"], { stdio: "inherit" });
    process.exit(res.status);
  });

program
  .command("aws:deploy")
  .description("Run full AWS deploy (RDS, S3, ECR, ECS, CloudFront)")
  .action(() => {
    console.log("→ Running full cloud deploy…");
    const res = spawnSync("bash", ["aws/deploy.sh"], { stdio: "inherit" });
    process.exit(res.status);
  });

program
  .command("aws:logs")
  .description("Tail logs for backend ECS tasks")
  .option("-n, --num <count>", "How many log lines to show", "100")
  .action(({ num }) => {
    const cluster = process.env.ECS_CLUSTER || "petswipe-cluster";
    const service = process.env.ECS_SERVICE_BACKEND || "petswipe-backend-svc";
    console.log(`→ Fetching last ${num} lines of logs from ${service}…`);
    // Get the task ID
    const taskId = spawnSync(
      "aws",
      [
        "ecs",
        "list-tasks",
        "--cluster",
        cluster,
        "--service-name",
        service,
        "--desired-status",
        "RUNNING",
        "--query",
        "taskArns[0]",
        "--output",
        "text",
      ],
      { encoding: "utf8" },
    ).stdout.trim();

    if (!taskId) {
      console.error("No running tasks found.");
      process.exit(1);
    }

    // Describe to find container name & log group
    const desc = JSON.parse(
      spawnSync(
        "aws",
        [
          "ecs",
          "describe-tasks",
          "--cluster",
          cluster,
          "--tasks",
          taskId,
          "--query",
          "tasks[0].containers[0].logConfiguration.options",
          "--output",
          "json",
        ],
        { encoding: "utf8" },
      ).stdout,
    );

    const logGroup = desc["awslogs-group"];
    const logStreamPrefix = desc["awslogs-stream-prefix"];
    const containerName = desc["awslogs-stream-prefix"]; // often same as prefix

    if (!logGroup || !logStreamPrefix) {
      console.error(
        "Could not determine log group or stream prefix from task definition.",
      );
      process.exit(1);
    }

    // Build stream name filter: prefix/containerName/taskId
    const streamName = `${logStreamPrefix}/${containerName}/${taskId.split("/").pop()}`;

    // Spawn aws logs tail
    const tail = spawn(
      "aws",
      [
        "logs",
        "tail",
        logGroup,
        "--follow",
        "--since",
        "1h",
        "--filter-pattern",
        streamName,
        "--limit",
        num,
      ],
      { stdio: "inherit" },
    );
    tail.on("close", (code) => process.exit(code));
  });

program.parse(process.argv);
