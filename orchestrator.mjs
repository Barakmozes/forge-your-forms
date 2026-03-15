#!/usr/bin/env node

/**
 * Super Orchestrator — Dual-Automation Pipeline Runner
 *
 * Drives the Scanner → Builder → Agents → Verification pipeline
 * using `claude -p` (print mode) for non-interactive execution.
 *
 * Usage:
 *   node orchestrator.mjs run                  # Full pipeline
 *   node orchestrator.mjs resume               # Resume from checkpoint
 *   node orchestrator.mjs status               # Show state dashboard
 *   node orchestrator.mjs scan                 # Scanner phase only
 *   node orchestrator.mjs build                # Builder phase only
 *   node orchestrator.mjs agents               # Agent phase only
 *   node orchestrator.mjs verify               # Verification only
 *
 * Zero npm dependencies — uses only node: built-ins.
 */

import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, stat, rename, access, unlink } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { createInterface } from "node:readline";
import { cpus } from "node:os";

// ────────────────────────────────────────────────────────────────────────────
// § 1. Constants & Defaults
// ────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const ORCH_DIR = join(ROOT, ".orchestrator");
const LOGS_DIR = join(ORCH_DIR, "logs");
const STATE_FILE = join(ORCH_DIR, "state.json");
const CONFIG_FILE = join(ROOT, "orchestrator.config.json");
const PROMPT_FILE_DEFAULT = "DUAL-AUTOMATION-PROMPT.md";

const DEFAULTS = {
  models: {
    scanner: "claude-opus-4-6",
    builder: "claude-opus-4-6",
    agents: "claude-sonnet-4-6",
    verification: "claude-sonnet-4-6",
    gateFix: "claude-sonnet-4-6",
  },
  budgetPerPhase: 10,
  budgetTotal: 50,
  parallelism: 3,
  maxContextRestarts: { scanner: 20, builder: 15, agent: 10 },
  timeoutMs: 600000, // 10 minutes
  verifyCommands: ["npm run lint", "npx tsc --noEmit", "npm run build"],
  promptFile: PROMPT_FILE_DEFAULT,
  dimensionsFile: "SCAN-DIMENSIONS.md",
  templatesFile: "AGENT-TEMPLATES.md",
  agentsDir: ".agents",
  qualityGates: { enabled: true, autoFixAttempts: 1 },
  claudeFlags: [],
};

// ────────────────────────────────────────────────────────────────────────────
// § 2. Color helpers (ANSI)
// ────────────────────────────────────────────────────────────────────────────

const isColorSupported = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  reset: isColorSupported ? "\x1b[0m" : "",
  bold: isColorSupported ? "\x1b[1m" : "",
  dim: isColorSupported ? "\x1b[2m" : "",
  red: isColorSupported ? "\x1b[31m" : "",
  green: isColorSupported ? "\x1b[32m" : "",
  yellow: isColorSupported ? "\x1b[33m" : "",
  blue: isColorSupported ? "\x1b[34m" : "",
  magenta: isColorSupported ? "\x1b[35m" : "",
  cyan: isColorSupported ? "\x1b[36m" : "",
  white: isColorSupported ? "\x1b[37m" : "",
  bgGreen: isColorSupported ? "\x1b[42m" : "",
  bgRed: isColorSupported ? "\x1b[41m" : "",
  bgYellow: isColorSupported ? "\x1b[43m" : "",
};

// ────────────────────────────────────────────────────────────────────────────
// § 3. Logging
// ────────────────────────────────────────────────────────────────────────────

let orchLogStream = null;

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(msg, level = "info") {
  const ts = timestamp();
  const prefix =
    level === "error" ? `${c.red}[ERROR]${c.reset}` :
    level === "warn"  ? `${c.yellow}[WARN]${c.reset}` :
    level === "ok"    ? `${c.green}[OK]${c.reset}` :
    level === "skip"  ? `${c.dim}[SKIP]${c.reset}` :
                        `${c.cyan}[INFO]${c.reset}`;
  console.log(`${c.dim}${ts}${c.reset} ${prefix} ${msg}`);
  appendLog(`${ts} [${level.toUpperCase()}] ${msg}\n`);
}

function logHeader(msg) {
  const line = "═".repeat(60);
  console.log(`\n${c.bold}${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}  ${msg}${c.reset}`);
  console.log(`${c.bold}${c.cyan}${line}${c.reset}\n`);
  appendLog(`\n${"=".repeat(60)}\n  ${msg}\n${"=".repeat(60)}\n\n`);
}

function logPhase(num, total, name, status) {
  const statusColor =
    status === "COMPLETE"     ? `${c.green}${status}${c.reset}` :
    status === "IN PROGRESS"  ? `${c.yellow}${status}${c.reset}` :
    status === "FAILED"       ? `${c.red}${status}${c.reset}` :
    status === "SKIPPED"      ? `${c.dim}${status}${c.reset}` :
                                `${c.dim}${status}${c.reset}`;
  const dots = ".".repeat(Math.max(2, 48 - name.length));
  console.log(`  [${num}/${total}] ${c.bold}${name}${c.reset} ${c.dim}${dots}${c.reset} ${statusColor}`);
}

async function appendLog(text) {
  if (!orchLogStream) return;
  try { await writeFile(orchLogStream, text, { flag: "a" }); } catch { /* ignore */ }
}

async function writeSessionLog(name, content) {
  const logPath = join(LOGS_DIR, `${name}.log`);
  try { await writeFile(logPath, content, { flag: "a" }); } catch { /* ignore */ }
}

// ────────────────────────────────────────────────────────────────────────────
// § 4. State Management
// ────────────────────────────────────────────────────────────────────────────

function defaultState() {
  return {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phases: {
      scanner: { status: "pending", sessions: 0, duration: 0 },
      builder: { status: "pending", sessions: 0, duration: 0 },
      agents: { status: "pending", sessions: 0, duration: 0, batches: {} },
      verify: { status: "pending", results: {} },
    },
    agentsDir: null,
    totalSessions: 0,
    gateHistory: [],
  };
}

async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

async function saveState(state) {
  state.updatedAt = new Date().toISOString();
  const tmp = STATE_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(state, null, 2));
  try { await unlink(STATE_FILE); } catch { /* may not exist yet */ }
  await rename(tmp, STATE_FILE);
}

let stateSaveLock = Promise.resolve();

function saveStateSafe(state) {
  stateSaveLock = stateSaveLock.then(() => saveState(state)).catch(() => {});
  return stateSaveLock;
}

// ────────────────────────────────────────────────────────────────────────────
// § 5. Config & CLI Parsing
// ────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { command: null, flags: {} };
  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.flags[key] = next;
        i++;
      } else {
        args.flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  args.command = positional[0] || "run";
  return args;
}

async function loadConfig(flagConfigPath) {
  const configPath = flagConfigPath || CONFIG_FILE;
  try {
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function mergeConfig(fileConfig, flags) {
  const cfg = { ...DEFAULTS };

  // Merge file config
  if (fileConfig.models) cfg.models = { ...cfg.models, ...fileConfig.models };
  if (fileConfig.budgetPerPhase != null) cfg.budgetPerPhase = fileConfig.budgetPerPhase;
  if (fileConfig.budgetTotal != null) cfg.budgetTotal = fileConfig.budgetTotal;
  if (fileConfig.parallelism != null) cfg.parallelism = fileConfig.parallelism;
  if (fileConfig.maxContextRestarts) cfg.maxContextRestarts = { ...cfg.maxContextRestarts, ...fileConfig.maxContextRestarts };
  if (fileConfig.timeoutMs != null) cfg.timeoutMs = fileConfig.timeoutMs;
  if (fileConfig.verifyCommands) cfg.verifyCommands = fileConfig.verifyCommands;
  if (fileConfig.promptFile) cfg.promptFile = fileConfig.promptFile;
  if (fileConfig.dimensionsFile) cfg.dimensionsFile = fileConfig.dimensionsFile;
  if (fileConfig.templatesFile) cfg.templatesFile = fileConfig.templatesFile;
  if (fileConfig.agentsDir) cfg.agentsDir = fileConfig.agentsDir;
  if (fileConfig.qualityGates) cfg.qualityGates = { ...cfg.qualityGates, ...fileConfig.qualityGates };
  if (fileConfig.claudeFlags) cfg.claudeFlags = fileConfig.claudeFlags;

  // Detect old config and warn about V4 defaults
  if (!fileConfig.dimensionsFile && !fileConfig.templatesFile) {
    log("Config upgraded with V4 defaults (dimensionsFile, templatesFile, qualityGates).", "info");
  }

  // CLI flags override everything
  if (flags.budget) cfg.budgetPerPhase = parseFloat(flags.budget);
  if (flags["budget-total"]) cfg.budgetTotal = parseFloat(flags["budget-total"]);
  if (flags.parallelism) cfg.parallelism = parseInt(flags.parallelism, 10);
  if (flags.timeout) cfg.timeoutMs = parseInt(flags.timeout, 10);
  if (flags["no-verify"]) cfg.skipVerify = true;
  if (flags.verbose) cfg.verbose = true;
  if (flags.quiet) cfg.quiet = true;
  if (flags["dry-run"]) cfg.dryRun = true;
  if (flags["agents-dir"]) cfg.agentsDir = flags["agents-dir"];

  // Model shorthand
  if (flags.model) {
    const m = flags.model === "opus" ? "claude-opus-4-6" :
              flags.model === "sonnet" ? "claude-sonnet-4-6" :
              flags.model;
    cfg.models = { scanner: m, builder: m, agents: m, verification: m };
  }

  return cfg;
}

// ────────────────────────────────────────────────────────────────────────────
// § 6. Prompt Extraction
// ────────────────────────────────────────────────────────────────────────────

async function extractPrompts(promptFilePath, cfg) {
  const content = await readFile(join(ROOT, promptFilePath), "utf-8");
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  let scannerStart = -1, scannerEnd = -1;
  let builderStart = -1, builderEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "---START SCANNER---") scannerStart = i;
    else if (trimmed === "---END SCANNER---") scannerEnd = i;
    else if (trimmed === "---START BUILDER---") builderStart = i;
    else if (trimmed === "---END BUILDER---") builderEnd = i;
  }

  if (scannerStart < 0 || scannerEnd < 0) {
    throw new Error(`Could not find ---START SCANNER--- / ---END SCANNER--- markers in ${promptFilePath}`);
  }
  if (builderStart < 0 || builderEnd < 0) {
    throw new Error(`Could not find ---START BUILDER--- / ---END BUILDER--- markers in ${promptFilePath}`);
  }

  const dimFile = cfg?.dimensionsFile || DEFAULTS.dimensionsFile;
  const tplFile = cfg?.templatesFile || DEFAULTS.templatesFile;

  const scannerPrepend = `CRITICAL FIRST STEP: Before starting any scan work, read the file "${dimFile}" from the project root. It contains all dimension output format templates you need for structured scan reports. If this file does not exist, output "ERROR: ${dimFile} not found" and stop immediately.\n\nIf you are RESUMING (scanner-reports/PROJECT-PROFILE.md already exists), read only the dimensions marked [x] in PROJECT-PROFILE.md "Active Scan Dimensions" section — not the entire ${dimFile} file. This saves tokens for actual scanning work.\n\n`;

  const builderPrepend = `CRITICAL FIRST STEP: Verify the file "${tplFile}" exists in the project root. You will read it at Phase 2 (not now) — but confirm it exists before proceeding with any work. If missing, output "ERROR: ${tplFile} not found" and stop immediately.\n\n`;

  return {
    scanner: scannerPrepend + lines.slice(scannerStart + 1, scannerEnd).join("\n").trim(),
    builder: builderPrepend + lines.slice(builderStart + 1, builderEnd).join("\n").trim(),
  };
}

async function parseCommandsFile(agentsDir) {
  // Find the COMMANDS.md file — may be named COMMANDS.md or PHASE-N-COMMANDS.md
  const dir = join(ROOT, agentsDir);
  let commandsPath = null;

  try {
    const files = await readdir(dir);
    const cmdFile = files.find(f => f.endsWith("COMMANDS.md") || f === "COMMANDS.md");
    if (cmdFile) commandsPath = join(dir, cmdFile);
  } catch {
    throw new Error(`Agents directory not found: ${agentsDir}`);
  }

  if (!commandsPath) {
    throw new Error(`No COMMANDS.md file found in ${agentsDir}`);
  }

  const content = await readFile(commandsPath, "utf-8");
  return parseCommandsContent(content);
}

function parseCommandsContent(content) {
  const batches = [];
  let currentBatch = null;

  const lines = content.split("\n").map(l => l.replace(/\r$/, ""));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect batch headers like "## Batch 1 — Sequential" or "## Batch 2 — Parallel"
    const batchMatch = line.match(/^## Batch (\d+)\s*[—–-]\s*(Sequential|Parallel)/i);
    if (batchMatch) {
      currentBatch = {
        number: parseInt(batchMatch[1], 10),
        type: batchMatch[2].toLowerCase(),
        agents: [],
      };
      batches.push(currentBatch);
      continue;
    }

    // Detect agent headers like "### Agent 21: ADMIN Role Bypass"
    const agentMatch = line.match(/^### Agent (\d+):\s*(.+?)(?:\s*⚡)?$/);
    if (agentMatch && currentBatch) {
      const agentId = parseInt(agentMatch[1], 10);
      const agentName = agentMatch[2].trim();

      // Extract the code block that follows
      let prompt = "";
      let inCodeBlock = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().startsWith("```") && !inCodeBlock) {
          inCodeBlock = true;
          continue;
        }
        if (lines[j].trim() === "```" && inCodeBlock) {
          break;
        }
        if (inCodeBlock) {
          prompt += lines[j] + "\n";
        }
      }

      currentBatch.agents.push({
        id: agentId,
        name: agentName,
        prompt: prompt.trim(),
        folder: null, // will be resolved from prompt content
      });
    }
  }

  // Extract folder paths from prompts
  for (const batch of batches) {
    for (const agent of batch.agents) {
      // Look for agent folder path in the prompt (e.g., ".agents-phase-7/feature-00-admin-role/AGENT.md")
      const folderMatch = agent.prompt.match(/(\.[^\s]+\/[^\s/]+)\/AGENT\.md/);
      if (folderMatch) {
        agent.folder = folderMatch[1];
      }
    }
  }

  return batches;
}

// ────────────────────────────────────────────────────────────────────────────
// § 7. File State Readers
// ────────────────────────────────────────────────────────────────────────────

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileSize(filePath) {
  try {
    const s = await stat(filePath);
    return s.size;
  } catch {
    return 0;
  }
}

async function parseScanQueue() {
  const path = join(ROOT, "scanner-reports", "SCAN-QUEUE.md");
  try {
    const content = await readFile(path, "utf-8");
    const features = [];
    for (const line of content.split("\n").map(l => l.replace(/\r$/, ""))) {
      // Match lines like "| 01-core-auth | READY | Session 1 |"
      const match = line.match(/\|\s*(\S+)\s*\|\s*(PENDING|SCANNING|READY|SKIPPED)\s*\|/);
      if (match) {
        features.push({ name: match[1], status: match[2] });
      }
    }
    return features;
  } catch {
    return null;
  }
}

async function parseMasterContext(agentsDir) {
  const path = join(ROOT, agentsDir, "MASTER-CONTEXT.md");
  try {
    const content = await readFile(path, "utf-8");

    // Check overall status
    const statusMatch = content.match(/## Status:\s*(\w+)/);
    const status = statusMatch ? statusMatch[1] : "UNKNOWN";

    // Parse agent entries
    const agents = [];
    for (const line of content.split("\n").map(l => l.replace(/\r$/, ""))) {
      // "- feature-00-admin-role: AGENTS_CREATED (Agent 21 — Batch 1)"
      const match = line.match(/-\s+(\S+):\s+(AWAITING_CREATION|AGENTS_CREATED|CREATED)\s*\(Agent\s+(\d+)\s*[—–-]\s*Batch\s+(\d+)\)/);
      if (match) {
        agents.push({
          folder: match[1],
          status: match[2],
          agentId: parseInt(match[3], 10),
          batch: parseInt(match[4], 10),
        });
      }
    }

    return { status, agents };
  } catch {
    return null;
  }
}

async function parseProgress(progressPath) {
  try {
    const content = await readFile(progressPath, "utf-8");

    // Check overall status line
    const statusMatch = content.match(/## Status:\s*(\w+)/);
    const status = statusMatch ? statusMatch[1] : "UNKNOWN";

    // Parse prompt table
    const prompts = [];
    for (const line of content.split("\n").map(l => l.replace(/\r$/, ""))) {
      // "| 21.0 | ✅ Complete | ... |" or "| 21.1 | NOT_STARTED | ... |"
      const match = line.match(/\|\s*(\d+\.\d+)\s*\|\s*(✅\s*Complete|COMPLETE|IN_PROGRESS|NOT_STARTED|⏳[^|]*|❌[^|]*)\s*\|/i);
      if (match) {
        const isComplete = /complete|✅/i.test(match[2]);
        prompts.push({ id: match[1], status: match[2].trim(), complete: isComplete });
      }
    }

    const allComplete = prompts.length > 0 && prompts.every(p => p.complete);
    return { status, prompts, allComplete };
  } catch {
    return null;
  }
}

async function parseHandoff(handoffPath) {
  try {
    const content = await readFile(handoffPath, "utf-8");
    const statusMatch = content.match(/## Status:\s*(\w+)/);
    return { status: statusMatch ? statusMatch[1] : "UNKNOWN" };
  } catch {
    return null;
  }
}

async function parseGapAnalysis(agentsDir) {
  const path = join(ROOT, agentsDir, "GAP-ANALYSIS.md");
  try {
    const content = await readFile(path, "utf-8");
    // Count unassigned P0/P1
    let unassignedP0 = 0, unassignedP1 = 0;
    for (const line of content.split("\n")) {
      if (/unassigned/i.test(line) && /P0/i.test(line)) unassignedP0++;
      if (/unassigned/i.test(line) && /P1/i.test(line)) unassignedP1++;
    }
    return { unassignedP0, unassignedP1 };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 8. Claude CLI Interface
// ────────────────────────────────────────────────────────────────────────────

/**
 * Error classification for recovery decisions.
 */
function classifyError(stderr, exitCode) {
  const text = (stderr || "").toLowerCase();
  if (text.includes("rate limit") || text.includes("429")) return "RATE_LIMIT";
  if (text.includes("econnrefused") || text.includes("etimedout") || text.includes("network")) return "NETWORK";
  if (text.includes("enospc")) return "FATAL_DISK";
  if (text.includes("budget") || text.includes("max-budget")) return "FATAL_BUDGET";
  if (text.includes("authentication") || text.includes("unauthorized") || text.includes("401")) return "FATAL_AUTH";
  if (exitCode !== 0) return "TRANSIENT_CRASH";
  return "UNKNOWN";
}

function detectSignals(text, signals) {
  const knownSignals = ["SCANNER_COMPLETE", "BUILDER_COMPLETE", "CONTEXT_LIMIT_REACHED"];
  for (const sig of knownSignals) {
    if (text.includes(sig) && !signals.includes(sig)) {
      signals.push(sig);
    }
  }
  // Agent completion: AGENT_NN_COMPLETE (capture all occurrences)
  for (const m of text.matchAll(/AGENT_(\d+)_COMPLETE/g)) {
    const sig = `AGENT_${m[1]}_COMPLETE`;
    if (!signals.includes(sig)) signals.push(sig);
  }
}

/**
 * Invoke `claude -p` with streaming JSON output.
 *
 * Returns: { signals: string[], exitCode: number, stderr: string, outputText: string }
 */
function invokeClaude(prompt, options = {}) {
  const {
    model = "claude-sonnet-4-6",
    budget = 10,
    timeoutMs = 600000,
    sessionLogName = "session",
    verbose = false,
    appendSystemPrompt = null,
  } = options;

  return new Promise((resolvePromise, rejectPromise) => {
    const args = [
      "-p", prompt,
      "--output-format", "stream-json",
      "--dangerously-skip-permissions",
      "--no-session-persistence",
      "--model", model,
      "--max-budget-usd", String(budget),
    ];

    if (appendSystemPrompt) {
      args.push("--append-system-prompt", appendSystemPrompt);
    }

    const proc = spawn("claude", args, {
      shell: true,
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    const signals = [];
    let stderrBuf = "";
    let outputText = "";
    let lastOutputTime = Date.now();
    let killed = false;

    function killProc() {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
      } else {
        proc.kill("SIGTERM");
      }
    }

    // Watchdog timer — kill if no output for timeoutMs
    const watchdog = setInterval(() => {
      if (Date.now() - lastOutputTime > timeoutMs) {
        log(`Watchdog: no output for ${timeoutMs / 1000}s — killing process`, "warn");
        killed = true;
        killProc();
        clearInterval(watchdog);
      }
    }, 30000);

    // Parse streaming JSON lines from stdout
    const rl = createInterface({ input: proc.stdout });
    rl.on("line", async (line) => {
      lastOutputTime = Date.now();
      await writeSessionLog(sessionLogName, line + "\n");

      try {
        const obj = JSON.parse(line);
        // stream-json emits objects with { type, subtype, ... }
        // Assistant text is in result blocks or content blocks
        let text = "";

        if (obj.type === "assistant" && obj.message?.content) {
          // Full message object
          for (const block of obj.message.content) {
            if (block.type === "text") text += block.text;
          }
        } else if (obj.type === "content_block_delta" && obj.delta?.text) {
          text = obj.delta.text;
        } else if (obj.type === "result" && obj.result) {
          text = typeof obj.result === "string" ? obj.result : JSON.stringify(obj.result);
        } else if (obj.content_block?.text) {
          text = obj.content_block.text;
        }

        if (text) {
          outputText += text;
          if (verbose) process.stdout.write(text);
          detectSignals(text, signals);
        }
      } catch {
        // Not JSON — might be raw text output
        outputText += line + "\n";
        if (verbose) console.log(line);
        detectSignals(line, signals);
      }
    });

    proc.stderr.on("data", (data) => {
      stderrBuf += data.toString();
      lastOutputTime = Date.now();
    });

    proc.on("close", (exitCode) => {
      clearInterval(watchdog);
      resolvePromise({
        signals,
        exitCode: exitCode ?? (killed ? 137 : 1),
        stderr: stderrBuf,
        outputText,
        killed,
      });
    });

    proc.on("error", (err) => {
      clearInterval(watchdog);
      rejectPromise(err);
    });

    // Handle SIGINT gracefully
    const sigintHandler = () => {
      log("Received SIGINT — terminating claude process...", "warn");
      killProc();
    };
    process.once("SIGINT", sigintHandler);
    proc.on("close", () => process.removeListener("SIGINT", sigintHandler));
  });
}

// ────────────────────────────────────────────────────────────────────────────
// § 9. Backoff & Retry Helpers
// ────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const CRASH_BACKOFFS = [5000, 15000, 45000, 120000, 300000];
const RATE_LIMIT_BACKOFFS = [10000, 30000, 60000, 120000, 240000, 480000, 600000, 600000];

// ────────────────────────────────────────────────────────────────────────────
// § 10. Scanner Phase
// ────────────────────────────────────────────────────────────────────────────

async function runScanner(cfg, state) {
  logHeader("PHASE 1: SCANNER");

  // Check if already complete
  const masterBriefPath = join(ROOT, "scanner-reports", "MASTER-BRIEF.md");
  const briefExists = await fileExists(masterBriefPath);
  const scanQueue = await parseScanQueue();
  const allReady = scanQueue && scanQueue.length > 0 && scanQueue.every(f => f.status === "READY");

  if (briefExists && allReady) {
    state.phases.scanner.status = "complete";
    await saveState(state);
    log(`Scanner already complete (${scanQueue.length} features scanned)`, "skip");
    return true;
  }

  const { scanner: scannerPrompt } = await extractPrompts(cfg.promptFile, cfg);
  const maxRestarts = cfg.maxContextRestarts.scanner;
  let crashRetries = 0;
  let rateLimitRetries = 0;

  for (let attempt = 1; attempt <= maxRestarts; attempt++) {
    state.phases.scanner.status = "in_progress";
    state.phases.scanner.sessions = attempt;
    state.totalSessions++;
    await saveState(state);

    log(`Scanner session ${attempt}/${maxRestarts}...`);
    const start = Date.now();

    try {
      const result = await invokeClaude(scannerPrompt, {
        model: cfg.models.scanner,
        budget: cfg.budgetPerPhase,
        timeoutMs: cfg.timeoutMs,
        sessionLogName: `scanner-session-${attempt}`,
        verbose: cfg.verbose,
      });

      state.phases.scanner.duration += (Date.now() - start);

      // Check signals
      if (result.signals.includes("SCANNER_COMPLETE")) {
        log("Scanner emitted SCANNER_COMPLETE", "ok");
        break;
      }

      if (result.signals.includes("CONTEXT_LIMIT_REACHED")) {
        log(`Context limit reached in session ${attempt} — will re-invoke`, "warn");
        crashRetries = 0; // reset crash counter on successful context limit
        continue;
      }

      // No signal — check exit code
      if (result.exitCode !== 0) {
        const errType = classifyError(result.stderr, result.exitCode);
        if (errType === "RATE_LIMIT") {
          const backoff = RATE_LIMIT_BACKOFFS[Math.min(rateLimitRetries, RATE_LIMIT_BACKOFFS.length - 1)];
          rateLimitRetries++;
          log(`Rate limit hit — backing off ${backoff / 1000}s`, "warn");
          await sleep(backoff);
          continue;
        }
        if (errType.startsWith("FATAL")) {
          log(`Fatal error: ${errType} — ${result.stderr.slice(0, 200)}`, "error");
          state.phases.scanner.status = "failed";
          await saveState(state);
          return false;
        }
        // Transient crash
        const backoff = CRASH_BACKOFFS[Math.min(crashRetries, CRASH_BACKOFFS.length - 1)];
        crashRetries++;
        log(`Claude crashed (exit ${result.exitCode}) — retrying in ${backoff / 1000}s`, "warn");
        await sleep(backoff);
        continue;
      }

      // Exit 0, no signal — check file state
      const briefNow = await fileExists(masterBriefPath);
      const queueNow = await parseScanQueue();
      const allReadyNow = queueNow && queueNow.length > 0 && queueNow.every(f => f.status === "READY");

      if (briefNow && allReadyNow) {
        log("Scanner complete (detected from file state)", "ok");
        break;
      }

      if (queueNow && queueNow.some(f => f.status === "PENDING")) {
        log("Incomplete scan queue — treating as context limit, re-invoking", "warn");
        continue;
      }

      log("No signal, no file state change — retrying", "warn");

    } catch (err) {
      log(`Error spawning claude: ${err.message}`, "error");
      if (err.message.includes("ENOENT")) {
        log("claude CLI not found. Install: https://docs.anthropic.com/en/docs/claude-code", "error");
        state.phases.scanner.status = "failed";
        await saveState(state);
        return false;
      }
      const backoff = CRASH_BACKOFFS[Math.min(crashRetries, CRASH_BACKOFFS.length - 1)];
      crashRetries++;
      await sleep(backoff);
    }
  }

  // Post-scanner validation
  const briefFinal = await fileExists(masterBriefPath);
  const briefSize = await fileSize(masterBriefPath);
  const queueFinal = await parseScanQueue();
  const allReadyFinal = queueFinal && queueFinal.length > 0 && queueFinal.every(f => f.status === "READY");

  if (!briefFinal || briefSize < 100) {
    log("Scanner validation FAILED: MASTER-BRIEF.md missing or too small", "error");
    state.phases.scanner.status = "failed";
    await saveState(state);
    return false;
  }

  if (!allReadyFinal) {
    log("Scanner validation WARN: Not all features in READY state", "warn");
  }

  const count = queueFinal ? queueFinal.length : "?";
  log(`Scanner complete. ${count} features scanned.`, "ok");
  state.phases.scanner.status = "complete";
  await saveState(state);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// § 11. Builder Phase
// ────────────────────────────────────────────────────────────────────────────

async function runBuilder(cfg, state) {
  logHeader("PHASE 2: BUILDER");

  const agentsDir = state.agentsDir || cfg.agentsDir;

  // Check if already complete
  const mc = await parseMasterContext(agentsDir);
  if (mc && mc.status === "COMPLETE") {
    // Verify COMMANDS.md exists
    const dir = join(ROOT, agentsDir);
    try {
      const files = await readdir(dir);
      if (files.some(f => f.endsWith("COMMANDS.md"))) {
        log(`Builder already complete (${mc.agents.length} agents in ${agentsDir})`, "skip");
        state.phases.builder.status = "complete";
        await saveState(state);
        return true;
      }
    } catch { /* fall through */ }
  }

  // Backup existing .agents/ if present
  const targetDir = join(ROOT, cfg.agentsDir);
  if (await fileExists(targetDir)) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = `${cfg.agentsDir}-backup-${ts}`;
    const backupDir = join(ROOT, backupName);
    log(`Backing up existing ${cfg.agentsDir} → ${backupName}`, "warn");
    await rename(targetDir, backupDir);
  }

  const { builder: builderPrompt } = await extractPrompts(cfg.promptFile, cfg);
  const maxRestarts = cfg.maxContextRestarts.builder;
  let crashRetries = 0;
  let rateLimitRetries = 0;

  state.agentsDir = cfg.agentsDir;
  await saveState(state);

  for (let attempt = 1; attempt <= maxRestarts; attempt++) {
    state.phases.builder.status = "in_progress";
    state.phases.builder.sessions = attempt;
    state.totalSessions++;
    await saveState(state);

    log(`Builder session ${attempt}/${maxRestarts}...`);
    const start = Date.now();

    try {
      const result = await invokeClaude(builderPrompt, {
        model: cfg.models.builder,
        budget: cfg.budgetPerPhase,
        timeoutMs: cfg.timeoutMs,
        sessionLogName: `builder-session-${attempt}`,
        verbose: cfg.verbose,
      });

      state.phases.builder.duration += (Date.now() - start);

      if (result.signals.includes("BUILDER_COMPLETE")) {
        log("Builder emitted BUILDER_COMPLETE", "ok");
        break;
      }

      if (result.signals.includes("CONTEXT_LIMIT_REACHED")) {
        log(`Context limit reached in session ${attempt} — will re-invoke`, "warn");
        crashRetries = 0;
        continue;
      }

      if (result.exitCode !== 0) {
        const errType = classifyError(result.stderr, result.exitCode);
        if (errType === "RATE_LIMIT") {
          const backoff = RATE_LIMIT_BACKOFFS[Math.min(rateLimitRetries, RATE_LIMIT_BACKOFFS.length - 1)];
          rateLimitRetries++;
          log(`Rate limit hit — backing off ${backoff / 1000}s`, "warn");
          await sleep(backoff);
          continue;
        }
        if (errType.startsWith("FATAL")) {
          log(`Fatal error: ${errType} — ${result.stderr.slice(0, 200)}`, "error");
          state.phases.builder.status = "failed";
          await saveState(state);
          return false;
        }
        const backoff = CRASH_BACKOFFS[Math.min(crashRetries, CRASH_BACKOFFS.length - 1)];
        crashRetries++;
        log(`Claude crashed (exit ${result.exitCode}) — retrying in ${backoff / 1000}s`, "warn");
        await sleep(backoff);
        continue;
      }

      // Exit 0, no signal — check file state
      const mcNow = await parseMasterContext(cfg.agentsDir);
      if (mcNow && mcNow.status === "COMPLETE") {
        log("Builder complete (detected from file state)", "ok");
        break;
      }

      if (mcNow && mcNow.agents.some(a => a.status === "AWAITING_CREATION")) {
        log("Incomplete agent creation — treating as context limit, re-invoking", "warn");
        continue;
      }

      log("No signal, no file state change — retrying", "warn");

    } catch (err) {
      log(`Error: ${err.message}`, "error");
      const backoff = CRASH_BACKOFFS[Math.min(crashRetries, CRASH_BACKOFFS.length - 1)];
      crashRetries++;
      await sleep(backoff);
    }
  }

  // Post-builder validation
  const agDir = cfg.agentsDir;
  const mcFinal = await parseMasterContext(agDir);
  if (!mcFinal || mcFinal.status !== "COMPLETE") {
    log("Builder validation FAILED: MASTER-CONTEXT.md not COMPLETE", "error");
    state.phases.builder.status = "failed";
    await saveState(state);
    return false;
  }

  // Validate GAP-ANALYSIS.md
  const gap = await parseGapAnalysis(agDir);
  if (gap && (gap.unassignedP0 > 0 || gap.unassignedP1 > 0)) {
    log(`GAP-ANALYSIS: ${gap.unassignedP0} unassigned P0, ${gap.unassignedP1} unassigned P1`, "warn");
  }

  // Validate agent folders
  let validFolders = 0;
  for (const agent of mcFinal.agents) {
    const folder = join(ROOT, agDir, agent.folder);
    const requiredFiles = ["AGENT.md", "PROMPTS.md", "PROGRESS.md", "HANDOFF.md"];
    let allPresent = true;
    for (const f of requiredFiles) {
      if (!await fileExists(join(folder, f))) {
        log(`Missing ${f} in ${agent.folder}`, "warn");
        allPresent = false;
      }
    }
    if (allPresent) validFolders++;
  }

  log(`Builder complete. ${validFolders}/${mcFinal.agents.length} agent folders valid.`, "ok");
  state.phases.builder.status = "complete";
  state.agentsDir = agDir;
  await saveState(state);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// § 12. Agent Execution
// ────────────────────────────────────────────────────────────────────────────

async function isAgentComplete(agentFolder) {
  const progressPath = join(ROOT, agentFolder, "PROGRESS.md");
  const handoffPath = join(ROOT, agentFolder, "HANDOFF.md");

  const progress = await parseProgress(progressPath);
  const handoff = await parseHandoff(handoffPath);

  if (progress && progress.allComplete) return true;
  if (progress && progress.status === "COMPLETE") return true;
  if (handoff && handoff.status === "COMPLETE") return true;

  return false;
}

async function executeAgent(agent, cfg, state) {
  const agentLabel = `Agent ${agent.id} (${agent.name})`;

  if (agent.folder && await isAgentComplete(agent.folder)) {
    log(`${agentLabel}: already complete`, "skip");
    return { status: "complete", attempts: 0, skipped: true };
  }

  const maxRestarts = cfg.maxContextRestarts.agent;
  let crashRetries = 0;
  let rateLimitRetries = 0;

  const systemPromptSuffix = [
    "After each prompt completion, update PROGRESS.md.",
    `When all prompts are COMPLETE, output: AGENT_${agent.id}_COMPLETE.`,
    "If approaching context limits, output: CONTEXT_LIMIT_REACHED.",
  ].join(" ");

  for (let attempt = 1; attempt <= maxRestarts; attempt++) {
    state.totalSessions++;
    await saveStateSafe(state);

    log(`${agentLabel}: session ${attempt}/${maxRestarts}...`);
    const start = Date.now();

    try {
      const result = await invokeClaude(agent.prompt, {
        model: cfg.models.agents,
        budget: cfg.budgetPerPhase,
        timeoutMs: cfg.timeoutMs,
        sessionLogName: `agent-${agent.id}-session-${attempt}`,
        verbose: cfg.verbose,
        appendSystemPrompt: systemPromptSuffix,
      });

      const duration = Date.now() - start;

      // Check for agent completion signal
      const completeSig = `AGENT_${agent.id}_COMPLETE`;
      if (result.signals.includes(completeSig)) {
        log(`${agentLabel}: COMPLETE (session ${attempt}, ${Math.round(duration / 1000)}s)`, "ok");
        return { status: "complete", attempts: attempt, duration };
      }

      if (result.signals.includes("CONTEXT_LIMIT_REACHED")) {
        log(`${agentLabel}: context limit in session ${attempt} — re-invoking`, "warn");
        crashRetries = 0;
        continue;
      }

      if (result.exitCode !== 0) {
        const errType = classifyError(result.stderr, result.exitCode);
        if (errType === "RATE_LIMIT") {
          const backoff = RATE_LIMIT_BACKOFFS[Math.min(rateLimitRetries, RATE_LIMIT_BACKOFFS.length - 1)];
          rateLimitRetries++;
          log(`${agentLabel}: rate limit — backing off ${backoff / 1000}s`, "warn");
          await sleep(backoff);
          continue;
        }
        if (errType.startsWith("FATAL")) {
          log(`${agentLabel}: fatal error — ${errType}`, "error");
          return { status: "failed", attempts: attempt, error: errType };
        }
        const backoff = CRASH_BACKOFFS[Math.min(crashRetries, CRASH_BACKOFFS.length - 1)];
        crashRetries++;
        log(`${agentLabel}: crashed (exit ${result.exitCode}) — retrying in ${backoff / 1000}s`, "warn");
        await sleep(backoff);
        continue;
      }

      // Exit 0, no signal — check file state
      if (agent.folder && await isAgentComplete(agent.folder)) {
        log(`${agentLabel}: COMPLETE (detected from file state, session ${attempt})`, "ok");
        return { status: "complete", attempts: attempt, duration };
      }

      log(`${agentLabel}: no signal, incomplete — re-invoking`, "warn");

    } catch (err) {
      log(`${agentLabel}: error — ${err.message}`, "error");
      if (err.message.includes("ENOENT")) {
        return { status: "failed", attempts: attempt, error: "CLAUDE_NOT_FOUND" };
      }
      const backoff = CRASH_BACKOFFS[Math.min(crashRetries, CRASH_BACKOFFS.length - 1)];
      crashRetries++;
      await sleep(backoff);
    }
  }

  // Exhausted retries
  log(`${agentLabel}: exhausted ${maxRestarts} retries`, "error");
  return { status: "failed", attempts: maxRestarts, error: "MAX_RETRIES" };
}

// ────────────────────────────────────────────────────────────────────────────
// § 13b. Quality Gates (V4)
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_GATES = {
  1: { name: "Post-Infrastructure", commandKeys: ["lint", "typecheck"] },
  3: { name: "Post-Bugfix", commandKeys: ["build"] },
  5: { name: "Pre-Feature", commandKeys: ["build", "test"] },
  6: { name: "Post-Feature", commandKeys: ["build", "test"] },
};

function resolveGateCommands(commandKeys, verifyCommands) {
  const map = {
    lint: verifyCommands[0] || 'echo "No lint configured"',
    typecheck: verifyCommands[1] || 'echo "No typecheck configured"',
    build: verifyCommands[2] || 'echo "No build configured"',
    test: verifyCommands[3] || 'echo "No tests configured"',
  };
  return commandKeys.map(k => map[k]).filter(Boolean);
}

async function runQualityGate(batchNum, cfg, state) {
  if (!cfg.qualityGates?.enabled) return true;

  const gateDef = DEFAULT_GATES[batchNum];
  if (!gateDef) return true; // No gate for this batch

  log(`[GATE] Running quality gate '${gateDef.name}' after batch ${batchNum}`);

  const commands = resolveGateCommands(gateDef.commandKeys, cfg.verifyCommands);
  const maxAttempts = cfg.qualityGates.autoFixAttempts ?? 1;

  for (const cmd of commands) {
    let passed = false;

    // Try the command
    try {
      await runCommandRaw(cmd, { timeout: cfg.timeoutMs });
      log(`[GATE] Command passed: ${cmd}`, "ok");
      passed = true;
    } catch (err) {
      log(`[GATE] Command failed: ${cmd}`, "error");

      // Auto-fix attempts
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log(`[GATE] Attempting auto-fix (attempt ${attempt} of ${maxAttempts})...`);

        const errorText = (err.message || "").split("\n").slice(-200).join("\n");
        const fixPrompt = `Fix the following ${gateDef.commandKeys.includes("lint") ? "lint" : gateDef.commandKeys.includes("build") ? "build" : "test"} error in the project at ${ROOT}.\nMake ONLY the minimal changes needed to fix this specific error.\nDo not refactor, do not add features, do not change unrelated code.\n\nError output:\n${errorText}`;

        try {
          const fixResult = await invokeClaude(fixPrompt, {
            model: cfg.models.gateFix || DEFAULTS.models.gateFix,
            budget: cfg.budgetPerPhase,
            timeoutMs: cfg.timeoutMs,
            sessionLogName: `gate-fix-batch${batchNum}`,
            verbose: cfg.verbose,
          });

          if (fixResult.exitCode === 0) {
            log(`[GATE] Auto-fix session completed, re-testing...`);
          }
        } catch (fixErr) {
          log(`[GATE] Auto-fix session failed: ${fixErr.message}`, "warn");
        }

        // Re-run the failed command
        try {
          await runCommandRaw(cmd, { timeout: cfg.timeoutMs });
          log(`[GATE] Auto-fix succeeded for: ${cmd}`, "ok");
          passed = true;
          break;
        } catch (retryErr) {
          log(`[GATE] Still failing after auto-fix attempt ${attempt}`, "warn");
        }
      }
    }

    if (!passed) {
      // Gate failed — persist state and pause
      const errorSummary = `Command '${cmd}' failed after ${maxAttempts} auto-fix attempt(s)`;
      const gateLogPath = join(LOGS_DIR, `gate-${batchNum}.log`);

      try {
        const { stderr: fullError } = await runCommandRaw(cmd, { timeout: cfg.timeoutMs }).catch(e => ({ stderr: e.message }));
        await writeFile(gateLogPath, `Gate: ${gateDef.name}\nBatch: ${batchNum}\nCommand: ${cmd}\nTimestamp: ${new Date().toISOString()}\n\n${fullError || errorSummary}`);
      } catch {
        await writeFile(gateLogPath, `Gate: ${gateDef.name}\nBatch: ${batchNum}\nCommand: ${cmd}\nTimestamp: ${new Date().toISOString()}\n\n${errorSummary}`);
      }

      if (!state.gateHistory) state.gateHistory = [];
      state.gateHistory.push({
        batch: batchNum,
        gateName: gateDef.name,
        status: "FAILED",
        failedCommand: cmd,
        errorSummary,
        fullErrorLog: gateLogPath,
        autoFixAttempted: true,
        autoFixResult: "FAILED",
        autoFixSessions: maxAttempts,
        timestamp: new Date().toISOString(),
      });
      await saveState(state);

      log(`[GATE] GATE_FAILED_BATCH_${batchNum}`, "error");
      appendLog(`[GATE] GATE_FAILED_BATCH_${batchNum} — ${gateDef.name} — ${cmd}`);

      console.log(`
  ${c.yellow}Quality gate '${gateDef.name}' failed after batch ${batchNum}.${c.reset}

    Failed command: ${cmd}
    Error summary:  ${errorSummary}

    Options:
      1. Fix manually, then resume:
         node orchestrator.mjs resume

      2. Skip this gate (use with caution):
         node orchestrator.mjs resume --skip-gate --confirm

      3. View full error:
         cat ${gateLogPath}
`);
      return false; // Pause pipeline
    }
  }

  // All commands passed
  if (!state.gateHistory) state.gateHistory = [];
  state.gateHistory.push({
    batch: batchNum,
    gateName: gateDef.name,
    status: "PASSED",
    timestamp: new Date().toISOString(),
  });
  await saveState(state);

  log(`[GATE] GATE_PASSED_BATCH_${batchNum}`, "ok");
  appendLog(`[GATE] GATE_PASSED_BATCH_${batchNum} — ${gateDef.name}`);

  // Auto-commit after gate pass
  try {
    const { stdout: statusOut } = await runCommand("git", ["status", "--porcelain"]);
    if (statusOut.trim()) {
      await runCommand("git", ["add", "-A"]);
      await runCommand("git", ["commit", "-m", `[orchestrator] gate-${gateDef.name} passed after batch-${batchNum}`]);
    }
  } catch { /* non-fatal */ }

  return true;
}

async function runAgents(cfg, state) {
  logHeader("PHASE 3: AGENTS");

  const agentsDir = state.agentsDir || cfg.agentsDir;

  // Parse execution plan from COMMANDS.md
  let batches;
  try {
    batches = await parseCommandsFile(agentsDir);
  } catch (err) {
    log(`Failed to parse commands: ${err.message}`, "error");
    state.phases.agents.status = "failed";
    await saveState(state);
    return false;
  }

  if (batches.length === 0) {
    log("No batches found in COMMANDS.md", "error");
    state.phases.agents.status = "failed";
    await saveState(state);
    return false;
  }

  log(`Execution plan: ${batches.length} batches, ${batches.reduce((s, b) => s + b.agents.length, 0)} agents total`);

  state.phases.agents.status = "in_progress";
  await saveState(state);
  const phaseStart = Date.now();

  let totalComplete = 0;
  let totalFailed = 0;

  for (const batch of batches) {
    const batchLabel = `Batch ${batch.number} (${batch.type})`;
    log(`\n--- ${batchLabel}: ${batch.agents.length} agents ---`);

    const batchResults = [];

    if (batch.type === "sequential") {
      // Run agents one at a time
      for (const agent of batch.agents) {
        const result = await executeAgent(agent, cfg, state);
        batchResults.push({ agent, result });
        if (result.status === "complete") totalComplete++;
        else totalFailed++;
      }
    } else {
      // Parallel execution with concurrency limit
      const concurrency = cfg.parallelism;
      const chunks = [];
      for (let i = 0; i < batch.agents.length; i += concurrency) {
        chunks.push(batch.agents.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        log(`Running ${chunk.length} agents in parallel...`);
        const results = await Promise.allSettled(
          chunk.map(agent => executeAgent(agent, cfg, state))
        );

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const agent = chunk[i];
          if (r.status === "fulfilled") {
            batchResults.push({ agent, result: r.value });
            if (r.value.status === "complete") totalComplete++;
            else totalFailed++;
          } else {
            batchResults.push({ agent, result: { status: "failed", error: r.reason?.message } });
            totalFailed++;
          }
        }
      }
    }

    // Record batch results
    state.phases.agents.batches[batch.number] = {
      type: batch.type,
      agents: batchResults.map(r => ({
        id: r.agent.id,
        name: r.agent.name,
        status: r.result.status,
        attempts: r.result.attempts || 0,
      })),
    };
    await saveState(state);

    // Auto git commit after batch
    log(`Batch ${batch.number} complete — committing...`);
    try {
      // Only commit if there are actual changes
      const { stdout: statusOut } = await runCommand("git", ["status", "--porcelain"]);
      if (statusOut.trim()) {
        const commitMsg = `[orchestrator] batch-${batch.number} complete (${batch.agents.length} agents)`;
        await runCommand("git", ["add", "-A"]);
        await runCommand("git", ["commit", "-m", commitMsg]);
        log(`Git commit for batch ${batch.number}`, "ok");
      } else {
        log(`No changes to commit for batch ${batch.number}`, "skip");
      }
    } catch (err) {
      log(`Git commit failed (non-fatal): ${err.message}`, "warn");
    }

    // V4: Run quality gate after batch (if configured)
    const gateOk = await runQualityGate(batch.number, cfg, state);
    if (!gateOk) {
      // Gate failed — pipeline paused
      state.phases.agents.duration = Date.now() - phaseStart;
      state.phases.agents.status = "gate_paused";
      state.phases.agents.pausedAtBatch = batch.number;
      await saveState(state);
      return false;
    }
  }

  state.phases.agents.duration = Date.now() - phaseStart;
  state.phases.agents.status = totalFailed === 0 ? "complete" : "partial";
  await saveState(state);

  log(`Agents phase done: ${totalComplete} complete, ${totalFailed} failed`, totalFailed > 0 ? "warn" : "ok");
  return totalFailed === 0;
}

// ────────────────────────────────────────────────────────────────────────────
// § 13. Verification Phase
// ────────────────────────────────────────────────────────────────────────────

function runCommandRaw(shellCmd, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(shellCmd, [], {
      shell: true,
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => {
      if (code === 0) resolve({ stdout, stderr, code });
      else reject(new Error(`${shellCmd} exited with code ${code}\n${stderr}`));
    });
    proc.on("error", reject);
  });
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      shell: true,
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => {
      if (code === 0) resolve({ stdout, stderr, code });
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}\n${stderr}`));
    });
    proc.on("error", reject);
  });
}

async function runVerification(cfg, state) {
  logHeader("PHASE 4: VERIFICATION");

  if (cfg.skipVerify) {
    log("Verification skipped (--no-verify)", "skip");
    state.phases.verify.status = "skipped";
    await saveState(state);
    return true;
  }

  state.phases.verify.status = "in_progress";
  await saveState(state);

  const commands = cfg.verifyCommands;
  let allPass = true;

  for (const cmd of commands) {
    const parts = cmd.split(" ");
    const name = parts.length > 1 ? parts[1] : parts[0]; // e.g., "lint", "tsc", "build"
    log(`Running: ${cmd}`);

    try {
      const result = await runCommandRaw(cmd);
      log(`${name}: PASS`, "ok");
      state.phases.verify.results[cmd] = { status: "pass" };
      await writeSessionLog("verification", `\n--- ${cmd} ---\nPASS\n${result.stdout}\n`);
    } catch (err) {
      log(`${name}: FAIL — attempting auto-fix...`, "warn");
      await writeSessionLog("verification", `\n--- ${cmd} ---\nFAIL\n${err.message}\n`);

      // Attempt auto-fix
      const fixPrompt = `Fix these errors without changing behavior. Only fix the specific errors shown below. Run '${cmd}' after fixing to verify.\n\nErrors:\n${err.message.slice(0, 3000)}`;
      try {
        await invokeClaude(fixPrompt, {
          model: cfg.models.verification,
          budget: 3,
          timeoutMs: cfg.timeoutMs,
          sessionLogName: `verification-fix-${name}`,
          verbose: cfg.verbose,
        });

        // Re-run verification
        try {
          await runCommandRaw(cmd);
          log(`${name}: PASS (after auto-fix)`, "ok");
          state.phases.verify.results[cmd] = { status: "pass", autoFixed: true };
        } catch {
          log(`${name}: STILL FAILING after auto-fix`, "warn");
          state.phases.verify.results[cmd] = { status: "fail" };
          allPass = false;
        }
      } catch {
        log(`Auto-fix failed for ${name}`, "warn");
        state.phases.verify.results[cmd] = { status: "fail" };
        allPass = false;
      }
    }
  }

  state.phases.verify.status = allPass ? "complete" : "partial";
  await saveState(state);

  return allPass;
}

// ────────────────────────────────────────────────────────────────────────────
// § 14. Summary & Notification
// ────────────────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

async function generateSummary(state) {
  const totalDuration =
    (state.phases.scanner.duration || 0) +
    (state.phases.builder.duration || 0) +
    (state.phases.agents.duration || 0);

  // Count agents and roles
  let agentsComplete = 0, agentsFailed = 0;
  const roleCounts = {};
  const agentsDir = state.agentsDir || DEFAULTS.agentsDir;

  for (const batch of Object.values(state.phases.agents.batches || {})) {
    for (const agent of batch.agents || []) {
      if (agent.status === "complete") agentsComplete++;
      else agentsFailed++;

      // Parse role
      const agentDirPath = join(ROOT, agentsDir, agent.name || `agent-${String(agent.id).padStart(2, "0")}`);
      try {
        const role = await parseAgentRole(agentDirPath);
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      } catch { /* skip */ }
    }
  }
  const totalAgents = agentsComplete + agentsFailed;

  // V4: Read project type + dimensions
  const { projectType, activeCount } = await readProjectType();

  // Verification results
  const verifyResults = state.phases.verify.results || {};

  // V4: Gate results
  const gates = state.gateHistory || [];
  const gateNames = ["Post-Infrastructure", "Post-Bugfix", "Pre-Feature", "Post-Feature"];

  // V4: Product roadmap counts
  let featuresBuilt = 0, nextSprintIdeas = 0, futureBacklog = 0;
  try {
    const roadmap = (await readFile(join(ROOT, "PRODUCT-ROADMAP.md"), "utf-8")).replace(/\r\n/g, "\n");
    const sections = roadmap.split(/^## /m);
    for (const s of sections) {
      const rowCount = (s.match(/^\|[^|]/gm) || []).length;
      if (/built|implemented/i.test(s)) featuresBuilt = Math.max(0, rowCount - 1);
      else if (/next sprint|short.?term/i.test(s)) nextSprintIdeas = Math.max(0, rowCount - 1);
      else if (/future|backlog|long.?term/i.test(s)) futureBacklog = Math.max(0, rowCount - 1);
    }
  } catch { /* no roadmap — that's ok */ }

  const agentSessions = state.totalSessions - (state.phases.scanner.sessions || 0) - (state.phases.builder.sessions || 0);
  const totalCommits = Object.keys(state.phases.agents.batches || {}).length + gates.filter(g => g.status === "PASSED").length;

  const line = "═".repeat(60);
  console.log(`\n${c.bold}${c.green}${line}${c.reset}`);
  console.log(`${c.bold}  PIPELINE COMPLETE — V4 Full Lifecycle${c.reset}`);
  console.log(`${c.bold}${c.green}${line}${c.reset}\n`);

  console.log(`  Project:      ${basename(ROOT)} (${projectType})`);
  console.log(`  Duration:     ${formatDuration(totalDuration)}`);
  console.log(`  Sessions:     ${state.totalSessions} total (${state.phases.scanner.sessions || 0} scanner, ${state.phases.builder.sessions || 0} builder, ${agentSessions} agents)`);
  console.log(`  Agents:       ${agentsComplete}/${totalAgents} complete`);
  console.log(`  Dimensions:   ${activeCount}/24 scanned`);

  // By Role
  if (Object.keys(roleCounts).length > 0) {
    console.log(`\n  By Role:`);
    for (const [role, count] of Object.entries(roleCounts)) {
      const roleColor = ROLE_COLORS[role] || ROLE_COLORS.UNKNOWN;
      const label = isColorSupported ? `${roleColor}${role}${c.reset}` : role;
      console.log(`    ${label.padEnd(30)} ${count} agent${count > 1 ? "s" : ""}`);
    }
  }

  // Quality Gates
  console.log(`\n  Quality Gates:`);
  for (const gateName of gateNames) {
    const gate = gates.find(g => g.gateName === gateName);
    const status = gate
      ? (gate.status === "PASSED" ? `${c.green}PASS${c.reset}` :
         gate.status === "SKIPPED" ? `${c.yellow}SKIP${c.reset}` :
         `${c.red}FAIL${c.reset}`)
      : `${c.dim}N/A${c.reset}`;
    console.log(`    ${gateName.padEnd(24)} ${status}`);
  }

  // Verification
  if (Object.keys(verifyResults).length > 0) {
    console.log(`\n  Verification:`);
    for (const [cmd, r] of Object.entries(verifyResults)) {
      const icon = r.status === "pass" ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`;
      console.log(`    ${cmd}: ${icon}${r.autoFixed ? " (auto-fixed)" : ""}`);
    }
  }

  // Product Roadmap
  if (featuresBuilt > 0 || nextSprintIdeas > 0 || futureBacklog > 0) {
    console.log(`\n  Product Roadmap:`);
    console.log(`    Features built:    ${featuresBuilt}`);
    console.log(`    Next sprint ideas: ${nextSprintIdeas}`);
    console.log(`    Future backlog:    ${futureBacklog}`);
  }

  // Reports
  console.log(`\n  Reports:`);
  console.log(`    Pipeline report:  .orchestrator/logs/summary.md`);
  const hasRoadmap = await fileExists(join(ROOT, "PRODUCT-ROADMAP.md"));
  const hasFinalReport = await fileExists(join(ROOT, "FINAL-REPORT.md"));
  if (hasRoadmap) console.log(`    Product roadmap:  PRODUCT-ROADMAP.md`);
  if (hasFinalReport) console.log(`    Final report:     FINAL-REPORT.md`);
  console.log(`    Review changes:   git log --oneline -${totalCommits + 5}`);
  console.log(`${c.bold}${c.green}${line}${c.reset}\n`);

  // Write summary.md
  const summaryMd = [
    "# Pipeline Summary — V4",
    "",
    `- **Project**: ${basename(ROOT)} (${projectType})`,
    `- **Started**: ${state.startedAt}`,
    `- **Completed**: ${new Date().toISOString()}`,
    `- **Duration**: ${formatDuration(totalDuration)}`,
    `- **Total Sessions**: ${state.totalSessions}`,
    `- **Dimensions**: ${activeCount}/24`,
    "",
    "## Phases",
    "",
    `| Phase | Status | Sessions | Duration |`,
    `|-------|--------|----------|----------|`,
    `| Scanner | ${state.phases.scanner.status} | ${state.phases.scanner.sessions || 0} | ${formatDuration(state.phases.scanner.duration || 0)} |`,
    `| Builder | ${state.phases.builder.status} | ${state.phases.builder.sessions || 0} | ${formatDuration(state.phases.builder.duration || 0)} |`,
    `| Agents | ${state.phases.agents.status} | ${agentSessions} | ${formatDuration(state.phases.agents.duration || 0)} |`,
    `| Verify | ${state.phases.verify.status} | — | — |`,
    "",
    "## Agents",
    "",
    `| Agent | Role | Status | Attempts |`,
    `|-------|------|--------|----------|`,
    ...Object.values(state.phases.agents.batches || {}).flatMap(b =>
      (b.agents || []).map(a => `| ${a.name || `Agent ${a.id}`} | — | ${a.status} | ${a.attempts} |`)
    ),
    "",
    "## Quality Gates",
    "",
    ...gates.map(g => `- **${g.gateName}** (batch ${g.batch}): ${g.status}`),
    "",
    "## Verification",
    "",
    ...Object.entries(verifyResults).map(([cmd, r]) => `- **${cmd}**: ${r.status}${r.autoFixed ? " (auto-fixed)" : ""}`),
    "",
    "## Role Distribution",
    "",
    ...Object.entries(roleCounts).map(([role, count]) => `- ${role}: ${count}`),
    "",
  ].join("\n");

  await writeSessionLog("summary", ""); // ensure file exists
  await writeFile(join(LOGS_DIR, "summary.md"), summaryMd);

  // Terminal bell
  process.stdout.write("\x07");
}

// ────────────────────────────────────────────────────────────────────────────
// § 15. Status Dashboard
// ────────────────────────────────────────────────────────────────────────────

// V4: Role parsing and color support
const ROLE_COLORS = {
  ENGINEER:               '\x1b[32m',   // green
  RESPONSIVE_SPECIALIST:  '\x1b[36m',   // cyan
  SECURITY_ENGINEER:      '\x1b[31m',   // red
  PERFORMANCE_ENGINEER:   '\x1b[33m',   // yellow
  DEVOPS_ENGINEER:        '\x1b[33m',   // yellow
  PRODUCT_BUILDER:        '\x1b[35m',   // magenta
  ARCHITECT:              '\x1b[34m',   // blue
  DOCS_WRITER:            '\x1b[0m',    // default
  ROADMAP_COMPILER:       '\x1b[35m',   // magenta
  VERIFIER:               '\x1b[1;32m', // bold green
  UNKNOWN:                '\x1b[0m',    // default
};

async function parseAgentRole(agentDir) {
  const agentMd = join(agentDir, "AGENT.md");
  try {
    const content = await readFile(agentMd, "utf-8");
    const firstLine = content.replace(/\r\n/g, "\n").split("\n")[0];
    const match = firstLine.match(/\[(\w+)\]/);
    return match ? match[1] : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

async function readProjectType() {
  const profilePath = join(ROOT, "scanner-reports", "PROJECT-PROFILE.md");
  try {
    const content = (await readFile(profilePath, "utf-8")).replace(/\r\n/g, "\n");
    // Extract project type
    const typeMatch = content.match(/Project Type[:\s]*(\w[\w\s]*)/i);
    const projectType = typeMatch ? typeMatch[1].trim() : "Unknown";
    // Count active dimensions
    const activeCount = (content.match(/\[x\]/gi) || []).length;
    return { projectType, activeCount };
  } catch {
    return { projectType: "pending scan", activeCount: 0 };
  }
}

async function showStatus() {
  const state = await loadState();
  const line = "═".repeat(60);

  // V4: Read project type
  const { projectType, activeCount } = await readProjectType();

  console.log(`\n${c.bold}${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}  AGENT ORCHESTRATION DASHBOARD — V4${c.reset}`);
  console.log(`${c.bold}  Project: ${basename(ROOT)} | Type: ${projectType} | Dims: ${activeCount}/24${c.reset}`);
  console.log(`${c.bold}${c.cyan}${line}${c.reset}\n`);

  const phases = [
    ["Scanner", state.phases.scanner],
    ["Builder", state.phases.builder],
    ["Agents",  state.phases.agents],
    ["Verify",  state.phases.verify],
  ];

  console.log(`  ${"Phase".padEnd(12)} ${"Status".padEnd(14)} ${"Duration".padEnd(10)} Sessions`);
  console.log(`  ${"─".repeat(12)} ${"─".repeat(14)} ${"─".repeat(10)} ${"─".repeat(8)}`);

  for (const [name, phase] of phases) {
    const statusStr = (phase.status || "pending").toUpperCase();
    const dur = phase.duration ? formatDuration(phase.duration) : "--";
    const sess = phase.sessions || "--";
    console.log(`  ${name.padEnd(12)} ${statusStr.padEnd(14)} ${dur.padEnd(10)} ${sess}`);
  }

  // V4: Agent details with role colors
  const batchData = state.phases.agents.batches || {};
  const agentsDir = state.agentsDir || DEFAULTS.agentsDir;
  const roleCounts = {};

  if (Object.keys(batchData).length > 0) {
    console.log(`\n  Agent Details:`);
    for (const [batchNum, batch] of Object.entries(batchData)) {
      console.log(`    Batch ${batchNum} (${batch.type}):`);
      for (const agent of batch.agents || []) {
        const icon = agent.status === "complete" ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;

        // Parse role from AGENT.md
        let role = "UNKNOWN";
        const agentDirPath = join(ROOT, agentsDir, agent.name || `agent-${String(agent.id).padStart(2, "0")}`);
        try {
          role = await parseAgentRole(agentDirPath);
        } catch { /* use UNKNOWN */ }

        const roleColor = ROLE_COLORS[role] || ROLE_COLORS.UNKNOWN;
        const roleLabel = isColorSupported ? `${roleColor}(${role})${c.reset}` : `(${role})`;

        roleCounts[role] = (roleCounts[role] || 0) + 1;

        const nameStr = (agent.name || `agent-${agent.id}`).padEnd(30);
        console.log(`      ${icon} ${nameStr} ${agent.status.padEnd(10)} [${agent.attempts}]  ${roleLabel}`);
      }
    }
  }

  // V4: Role distribution summary
  if (Object.keys(roleCounts).length > 0) {
    const roleSummary = Object.entries(roleCounts)
      .map(([role, count]) => `${role}:${count}`)
      .join(", ");
    console.log(`\n  Roles: ${roleSummary}`);
  }

  // V4: Gate history
  const gates = state.gateHistory || [];
  if (gates.length > 0) {
    console.log(`\n  Quality Gates:`);
    for (const gate of gates) {
      const icon = gate.status === "PASSED" ? `${c.green}PASS${c.reset}` :
                   gate.status === "SKIPPED" ? `${c.yellow}SKIP${c.reset}` :
                   `${c.red}FAIL${c.reset}`;
      console.log(`    Batch ${gate.batch} (${gate.gateName}): ${icon}`);
    }
  }

  if (state.agentsDir) {
    console.log(`\n  Agents directory: ${state.agentsDir}`);
  }

  console.log(`\n  Resume: node orchestrator.mjs resume\n`);
}

// ────────────────────────────────────────────────────────────────────────────
// § 16. Dry Run
// ────────────────────────────────────────────────────────────────────────────

async function dryRun(cfg) {
  logHeader("DRY RUN — No changes will be made");

  // V4: File loading plan
  const dimFile = cfg.dimensionsFile || DEFAULTS.dimensionsFile;
  const tplFile = cfg.templatesFile || DEFAULTS.templatesFile;
  const dimExists = await fileExists(join(ROOT, dimFile));
  const tplExists = await fileExists(join(ROOT, tplFile));

  console.log(`  ${c.bold}File Plan:${c.reset}`);
  console.log(`  [DRY-RUN] Scanner will load: ${cfg.promptFile} + ${dimFile}`);
  console.log(`  [DRY-RUN] Builder will load: ${cfg.promptFile} + ${tplFile}`);
  if (dimExists) {
    const dimContent = (await readFile(join(ROOT, dimFile), "utf-8")).replace(/\r\n/g, "\n");
    console.log(`  [DRY-RUN] ${dimFile}: found (${dimContent.split("\n").length} lines)`);
  } else {
    console.log(`  [DRY-RUN] ${c.red}${dimFile}: NOT FOUND — Scanner will fail${c.reset}`);
  }
  if (tplExists) {
    const tplContent = (await readFile(join(ROOT, tplFile), "utf-8")).replace(/\r\n/g, "\n");
    console.log(`  [DRY-RUN] ${tplFile}: found (${tplContent.split("\n").length} lines)`);
  } else {
    console.log(`  [DRY-RUN] ${c.red}${tplFile}: NOT FOUND — Builder will fail${c.reset}`);
  }
  console.log("");

  // V4: Quality gate checkpoints
  if (cfg.qualityGates?.enabled) {
    console.log(`  ${c.bold}Quality Gates:${c.reset}`);
    console.log(`  After batch 1: Quality Gate 'Post-Infrastructure' (lint + typecheck)`);
    console.log(`  After batch 3: Quality Gate 'Post-Bugfix' (build)`);
    console.log(`  After batch 5: Quality Gate 'Pre-Feature' (build + test)`);
    console.log(`  After batch 6: Quality Gate 'Post-Feature' (build + test)`);
    console.log(`  Auto-fix model: ${cfg.models.gateFix || DEFAULTS.models.gateFix}`);
    console.log("");
  }

  console.log(`  1. ${c.bold}Scanner${c.reset}: Extract prompt (markers in ${cfg.promptFile}), invoke claude -p`);
  console.log(`     Model: ${cfg.models.scanner} | Budget: $${cfg.budgetPerPhase}`);
  console.log(`     Expected: 1-5 sessions for full codebase scan\n`);

  console.log(`  2. ${c.bold}Builder${c.reset}: Extract prompt, invoke claude -p`);
  console.log(`     Model: ${cfg.models.builder} | Budget: $${cfg.budgetPerPhase}`);
  console.log(`     Expected: 1-3 sessions\n`);

  console.log(`  3. ${c.bold}Agents${c.reset}: Execute per batch from COMMANDS.md`);
  console.log(`     Model: ${cfg.models.agents} | Budget: $${cfg.budgetPerPhase}/agent`);
  console.log(`     Parallelism: ${cfg.parallelism} concurrent agents\n`);

  console.log(`  4. ${c.bold}Verify${c.reset}: ${cfg.skipVerify ? "SKIPPED" : cfg.verifyCommands.join(", ")}\n`);

  console.log(`  ${c.dim}Estimated cost: $15-$80 | Estimated time: 30-120 min${c.reset}\n`);
}

// ────────────────────────────────────────────────────────────────────────────
// § 17. Pre-flight Checks
// ────────────────────────────────────────────────────────────────────────────

async function preflight(cfg) {
  const errors = [];

  // Check claude CLI
  try {
    await runCommand("claude", ["--version"]);
  } catch {
    errors.push("claude CLI not found in PATH. Install: https://docs.anthropic.com/en/docs/claude-code");
  }

  // Check prompt file
  if (!await fileExists(join(ROOT, cfg.promptFile))) {
    errors.push(`Prompt file not found: ${cfg.promptFile}`);
  }

  // Check for project rules
  const rulesFiles = ["CLAUDE.md", ".cursorrules", ".clinerules"];
  const hasRules = await Promise.all(rulesFiles.map(f => fileExists(join(ROOT, f))));
  if (!hasRules.some(Boolean)) {
    log("No project rules file found (CLAUDE.md, .cursorrules, etc.) — Scanner will still work but may produce less targeted results", "warn");
  }

  // Check git status
  try {
    const { stdout } = await runCommand("git", ["status", "--porcelain"]);
    if (stdout.trim()) {
      log(`Working directory has uncommitted changes (${stdout.trim().split("\n").length} files)`, "warn");
    }
  } catch { /* not a git repo — that's fine */ }

  // V4: Validate claudeFlags
  if (cfg.claudeFlags && cfg.claudeFlags.length > 0) {
    try {
      const flagTest = cfg.claudeFlags.join(" ");
      await runCommand("claude", ["-p", "echo test", ...cfg.claudeFlags], { timeout: 15000 });
      log(`claudeFlags ${JSON.stringify(cfg.claudeFlags)} accepted by claude -p.`);
    } catch {
      log(`claudeFlags ${JSON.stringify(cfg.claudeFlags)} not supported by claude -p.`, "warn");
      log("Falling back to no flags. Set CLAUDE_CODE_EFFORT_LEVEL env var instead.", "warn");
      if (process.platform === "win32") {
        log("Example: $env:CLAUDE_CODE_EFFORT_LEVEL=\"high\" (PowerShell)", "warn");
      } else {
        log("Example: export CLAUDE_CODE_EFFORT_LEVEL=high (bash/zsh)", "warn");
      }
      cfg.claudeFlags = [];
    }
  }

  if (errors.length > 0) {
    for (const err of errors) log(err, "error");
    return false;
  }
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// § 18. SIGINT Handler
// ────────────────────────────────────────────────────────────────────────────

let currentState = null;

async function handleSigint() {
  console.log(`\n${c.yellow}Interrupted. Saving state...${c.reset}`);
  if (currentState) {
    try {
      await saveState(currentState);
      console.log(`${c.green}State saved.${c.reset} Resume with: ${c.bold}node orchestrator.mjs resume${c.reset}\n`);
    } catch {
      console.log(`${c.red}Failed to save state!${c.reset}\n`);
    }
  }
  process.exit(130);
}

// ────────────────────────────────────────────────────────────────────────────
// § 19. Main Pipeline
// ────────────────────────────────────────────────────────────────────────────

async function runPipeline(cfg, entryPhase = "scanner") {
  const state = await loadState();
  currentState = state;

  // Show plan
  logHeader("DUAL-AUTOMATION ORCHESTRATOR");
  console.log(`  Project: ${basename(ROOT)} | Parallelism: ${cfg.parallelism}`);
  console.log(`  Budget: $${cfg.budgetPerPhase}/phase | Timeout: ${cfg.timeoutMs / 1000}s`);
  console.log(`  Models: Scanner=${cfg.models.scanner.split("-").pop()}, Builder=${cfg.models.builder.split("-").pop()}, Agents=${cfg.models.agents.split("-").pop()}`);
  console.log("");

  const phases = ["scanner", "builder", "agents", "verify"];
  const startIdx = phases.indexOf(entryPhase);

  // V4: Companion file existence checks
  const dimFile = cfg.dimensionsFile || DEFAULTS.dimensionsFile;
  const tplFile = cfg.templatesFile || DEFAULTS.templatesFile;

  if (startIdx <= 0 && !await fileExists(join(ROOT, dimFile))) {
    log(`${dimFile} not found in project root.`, "error");
    log(`The Scanner requires this file. Copy it alongside ${cfg.promptFile}.`, "error");
    log(`Files needed: ${cfg.promptFile}, ${dimFile}, ${tplFile}`, "error");
    process.exit(1);
  }
  if (startIdx <= 1 && !await fileExists(join(ROOT, tplFile))) {
    log(`${tplFile} not found in project root.`, "error");
    log(`The Builder requires this file. Copy it alongside ${cfg.promptFile}.`, "error");
    log(`Files needed: ${cfg.promptFile}, ${dimFile}, ${tplFile}`, "error");
    process.exit(1);
  }

  // Phase 1: Scanner
  if (startIdx <= 0) {
    logPhase(1, 4, "SCANNER", "IN PROGRESS");
    const ok = await runScanner(cfg, state);
    if (!ok) {
      logPhase(1, 4, "SCANNER", "FAILED");
      return;
    }
    logPhase(1, 4, "SCANNER", "COMPLETE");
  } else {
    logPhase(1, 4, "SCANNER", "SKIPPED");
  }

  // Phase 2: Builder
  if (startIdx <= 1) {
    logPhase(2, 4, "BUILDER", "IN PROGRESS");
    const ok = await runBuilder(cfg, state);
    if (!ok) {
      logPhase(2, 4, "BUILDER", "FAILED");
      return;
    }
    logPhase(2, 4, "BUILDER", "COMPLETE");
  } else {
    logPhase(2, 4, "BUILDER", "SKIPPED");
  }

  // Phase 3: Agents
  if (startIdx <= 2) {
    logPhase(3, 4, "AGENTS", "IN PROGRESS");
    const ok = await runAgents(cfg, state);
    logPhase(3, 4, "AGENTS", ok ? "COMPLETE" : "PARTIAL");
  } else {
    logPhase(3, 4, "AGENTS", "SKIPPED");
  }

  // Phase 4: Verification
  if (startIdx <= 3) {
    logPhase(4, 4, "VERIFY", "IN PROGRESS");
    const ok = await runVerification(cfg, state);
    logPhase(4, 4, "VERIFY", ok ? "COMPLETE" : "PARTIAL");
  } else {
    logPhase(4, 4, "VERIFY", "SKIPPED");
  }

  await generateSummary(state);
}

async function resumePipeline(cfg, flags = {}) {
  const state = await loadState();

  // V4: Handle gate-paused state
  if (state.phases.agents.status === "gate_paused") {
    const lastGate = (state.gateHistory || []).filter(g => g.status === "FAILED").pop();

    if (flags["skip-gate"]) {
      if (!flags.confirm) {
        log("ERROR: --skip-gate requires --confirm flag. This skips a quality check and may result in broken code in later batches.", "error");
        return;
      }
      // Skip the failed gate
      if (lastGate) {
        lastGate.status = "SKIPPED";
        log(`[WARN] Gate '${lastGate.gateName}' SKIPPED by user at batch ${lastGate.batch}`, "warn");
        appendLog(`[GATE] GATE_SKIPPED_BATCH_${lastGate.batch} — ${lastGate.gateName} — skipped by user`);
      }
      state.phases.agents.status = "in_progress";
      delete state.phases.agents.pausedAtBatch;
      await saveState(state);
      log("Resuming from Agents phase (gate skipped)");
      return runPipeline(cfg, "agents");
    }

    // Re-run the failed gate
    if (lastGate) {
      log(`Re-running failed gate '${lastGate.gateName}' at batch ${lastGate.batch}...`);
      const commands = resolveGateCommands(
        DEFAULT_GATES[lastGate.batch]?.commandKeys || [],
        cfg.verifyCommands
      );

      let allPass = true;
      for (const cmd of commands) {
        try {
          await runCommandRaw(cmd, { timeout: cfg.timeoutMs });
          log(`[GATE] Command passed: ${cmd}`, "ok");
        } catch {
          log(`[GATE] Command still failing: ${cmd}`, "error");
          console.log(`\n  Fix the issue manually, then run: node orchestrator.mjs resume`);
          console.log(`  Or skip: node orchestrator.mjs resume --skip-gate --confirm\n`);
          allPass = false;
          break;
        }
      }

      if (allPass) {
        lastGate.status = "PASSED";
        state.phases.agents.status = "in_progress";
        delete state.phases.agents.pausedAtBatch;
        await saveState(state);
        log(`[GATE] Gate '${lastGate.gateName}' now passes — resuming pipeline`, "ok");
        return runPipeline(cfg, "agents");
      }
      return;
    }
  }

  // Determine entry point from state
  if (state.phases.scanner.status !== "complete") {
    log("Resuming from Scanner phase");
    return runPipeline(cfg, "scanner");
  }
  if (state.phases.builder.status !== "complete") {
    log("Resuming from Builder phase");
    return runPipeline(cfg, "builder");
  }
  if (state.phases.agents.status !== "complete" && state.phases.agents.status !== "partial") {
    log("Resuming from Agents phase");
    return runPipeline(cfg, "agents");
  }
  if (state.phases.verify.status !== "complete" && state.phases.verify.status !== "skipped") {
    log("Resuming from Verification phase");
    return runPipeline(cfg, "verify");
  }

  log("All phases already complete. Nothing to resume.", "ok");
}

// ────────────────────────────────────────────────────────────────────────────
// § 20. Entry Point
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const { command, flags } = parseArgs(process.argv);
  const fileConfig = await loadConfig(flags.config);
  const cfg = mergeConfig(fileConfig, flags);

  // Ensure directories exist
  await mkdir(ORCH_DIR, { recursive: true });
  await mkdir(LOGS_DIR, { recursive: true });
  orchLogStream = join(LOGS_DIR, "orchestrator.log");

  // SIGINT handler
  process.on("SIGINT", handleSigint);

  switch (command) {
    case "run": {
      if (cfg.dryRun) return dryRun(cfg);
      const ok = await preflight(cfg);
      if (!ok) process.exit(1);
      return runPipeline(cfg);
    }

    case "resume": {
      const ok = await preflight(cfg);
      if (!ok) process.exit(1);
      return resumePipeline(cfg, flags);
    }

    case "status":
      return showStatus();

    case "scan": {
      const ok = await preflight(cfg);
      if (!ok) process.exit(1);
      const state = await loadState();
      currentState = state;
      return runScanner(cfg, state);
    }

    case "build": {
      const ok = await preflight(cfg);
      if (!ok) process.exit(1);
      const state = await loadState();
      currentState = state;
      return runBuilder(cfg, state);
    }

    case "agents": {
      const ok = await preflight(cfg);
      if (!ok) process.exit(1);
      const state = await loadState();
      currentState = state;
      return runAgents(cfg, state);
    }

    case "verify": {
      const ok = await preflight(cfg);
      if (!ok) process.exit(1);
      const state = await loadState();
      currentState = state;
      return runVerification(cfg, state);
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Usage: node orchestrator.mjs <run|resume|status|scan|build|agents|verify>`);
      console.log(`\nFlags:`);
      console.log(`  --budget <usd>        Budget per phase (default: 10)`);
      console.log(`  --budget-total <usd>  Total budget cap (default: 50)`);
      console.log(`  --parallelism <n>     Max concurrent agents (default: 3)`);
      console.log(`  --model <name>        Model for all phases (opus|sonnet|<full-id>)`);
      console.log(`  --dry-run             Show plan without executing`);
      console.log(`  --verbose             Show full claude stdout`);
      console.log(`  --no-verify           Skip verification phase`);
      console.log(`  --timeout <ms>        Output watchdog timeout (default: 600000)`);
      console.log(`  --agents-dir <path>   Agents directory (default: .agents)`);
      console.log(`  --config <path>       Config file path`);
      console.log(`  --skip-gate           Skip failed quality gate (resume only, requires --confirm)`);
      console.log(`  --confirm             Confirm gate skip`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`${c.red}Fatal error: ${err.message}${c.reset}`);
  if (currentState) {
    saveState(currentState).catch(() => {});
  }
  process.exit(1);
});
