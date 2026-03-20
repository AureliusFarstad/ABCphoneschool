#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const VALID_INCREMENTS = new Set(["patch", "minor", "major"]);
const increment = process.argv[2] ?? "patch";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/release-bump.js [patch|minor|major]");
  process.exit(0);
}

if (!VALID_INCREMENTS.has(increment)) {
  console.error(`Invalid increment: ${increment}`);
  console.error("Expected one of: patch, minor, major");
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, "..");
const appConfigPath = path.join(projectRoot, "app.config.ts");
const packageJsonPath = path.join(projectRoot, "package.json");

const run = (command, args) => {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });
};

const readReleaseVersion = () => {
  const content = readFileSync(appConfigPath, "utf8");
  const versionName = content.match(
    /const\s+VERSION_NAME\s*=\s*"([\d.]+)";/,
  )?.[1];
  const versionCode = content.match(/const\s+VERSION_CODE\s*=\s*(\d+);/)?.[1];

  if (!versionName || !versionCode) {
    throw new Error(
      "Could not read VERSION_NAME and VERSION_CODE from app.config.ts",
    );
  }

  return { versionName, versionCode };
};

const updatePackageVersion = (versionName) => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  packageJson.version = versionName;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
};

const resolveBranchName = () => {
  try {
    return execFileSync("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.env.GITHUB_REF_NAME ?? "";
  }
};

run("pnpm", [
  "exec",
  "expo-release-it",
  "bump",
  "--increment",
  increment,
  "--config",
  "expo-release-it.config.json",
]);

const { versionName, versionCode } = readReleaseVersion();
const tagName = `v${versionName}`;

updatePackageVersion(versionName);

run("git", ["add", "app.config.ts", "package.json"]);
run("git", ["commit", "-m", `chore: bump version to ${tagName}`]);
run("git", ["tag", "-a", tagName, "-m", tagName]);

const branchName = resolveBranchName();
if (branchName) {
  run("git", ["push", "origin", `HEAD:${branchName}`]);
} else {
  run("git", ["push"]);
}
run("git", ["push", "origin", tagName]);

console.log(`Released ${versionName} (${versionCode})`);
