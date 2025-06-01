#!/usr/bin/env node

/**
 * Petswipe AWS Messaging CLI Helpers
 *
 * Adds commands to the PetSwipe CLI for provisioning or updating
 * RabbitMQ and Redis (ElastiCache) clusters on AWS.
 *
 * Usage:
 *   petswipe aws:rabbitmq   # run aws/rabbitmq.sh
 *   petswipe aws:redis      # run aws/redis.sh
 *
 * @author Son Nguyen
 * @license MIT
 * @version 1.0.0
 * @date 2025-05-26
 */

const { program } = require("commander");
const { spawnSync } = require("child_process");

program
  .command("aws:rabbitmq")
  .description("Provision or update RabbitMQ cluster on AWS")
  .action(() => {
    console.log("→ Provisioning RabbitMQ cluster…");
    const res = spawnSync("bash", ["aws/rabbitmq.sh"], { stdio: "inherit" });
    process.exit(res.status);
  });

program
  .command("aws:redis")
  .description("Provision or update Redis (ElastiCache) cluster on AWS")
  .action(() => {
    console.log("→ Provisioning Redis (ElastiCache) cluster…");
    const res = spawnSync("bash", ["aws/redis.sh"], { stdio: "inherit" });
    process.exit(res.status);
  });

program.parse(process.argv);
