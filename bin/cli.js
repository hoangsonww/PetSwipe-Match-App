#!/usr/bin/env node
/**
 * Petswipe CLI (CommonJS)
 *
 * This script is a command-line interface for managing the PetSwipe project.
 * It provides commands to build, test, and deploy the backend and frontend applications.
 * It uses the Commander.js library to define the CLI commands and options.
 * The script also uses the child_process module to execute shell commands.
 */

const { program } = require("commander");
const { execSync } = require("child_process");

program
  .name("petswipe")
  .description("CLI for building, testing, and deploying the PetSwipe stack")
  .version("1.0.0");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

program
  .command("dev")
  .description("Start backend & frontend in dev mode")
  .action(() => run("make dev"));

program
  .command("build")
  .description("Build both backend & frontend")
  .action(() => run("make build-backend build-frontend"));

program
  .command("docker:build")
  .description("Build & push Docker images to GHCR")
  .action(() => run("make docker-build"));

program
  .command("up")
  .description("Pull images & start stack")
  .action(() => run("make up"));

program
  .command("down")
  .description("Stop the Docker Compose stack")
  .action(() => run("make down"));

program
  .command("clean")
  .description("Remove build artifacts")
  .action(() => run("make clean"));

program
  .command("lint")
  .description("Run linters in both projects")
  .action(() => run("make lint"));

program
  .command("test")
  .description("Run tests in both projects")
  .action(() => run("make test"));

program.parse(process.argv);
