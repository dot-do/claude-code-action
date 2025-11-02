import * as core from "@actions/core";
import { exec } from "child_process";
import { promisify } from "util";
import { unlink, writeFile, stat } from "fs/promises";
import { createWriteStream } from "fs";
import { spawn } from "child_process";
import { parse as parseShellArgs } from "shell-quote";

const execAsync = promisify(exec);

const PIPE_PATH = `${process.env.RUNNER_TEMP}/claude_prompt_pipe`;
const EXECUTION_FILE = `${process.env.RUNNER_TEMP}/claude-execution-output.json`;
const BASE_ARGS = ["--verbose", "--output-format", "stream-json"];

export type ClaudeOptions = {
  claudeArgs?: string;
  model?: string;
  pathToClaudeCodeExecutable?: string;
  allowedTools?: string;
  disallowedTools?: string;
  maxTurns?: string;
  mcpConfig?: string;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  claudeEnv?: string;
  fallbackModel?: string;
};

type PreparedConfig = {
  claudeArgs: string[];
  promptPath: string;
  env: Record<string, string>;
};

export function prepareRunConfig(
  promptPath: string,
  options: ClaudeOptions,
): PreparedConfig {
  // Build Claude CLI arguments:
  // 1. Prompt flag (always first)
  // 2. User's claudeArgs (full control)
  // 3. BASE_ARGS (always last, cannot be overridden)

  const claudeArgs = ["-p"];

  // Parse and add user's custom Claude arguments
  if (options.claudeArgs?.trim()) {
    const parsed = parseShellArgs(options.claudeArgs);
    const customArgs = parsed.filter(
      (arg): arg is string => typeof arg === "string",
    );
    claudeArgs.push(...customArgs);
  }

  // BASE_ARGS are always appended last (cannot be overridden)
  claudeArgs.push(...BASE_ARGS);

  const customEnv: Record<string, string> = {};

  if (process.env.INPUT_ACTION_INPUTS_PRESENT) {
    customEnv.GITHUB_ACTION_INPUTS = process.env.INPUT_ACTION_INPUTS_PRESENT;
  }

  return {
    claudeArgs,
    promptPath,
    env: customEnv,
  };
}

export async function runClaude(promptPath: string, options: ClaudeOptions) {
  const config = prepareRunConfig(promptPath, options);

  // Create a named pipe
  try {
    await unlink(PIPE_PATH);
  } catch (e) {
    // Ignore if file doesn't exist
  }

  // Create the named pipe
  await execAsync(`mkfifo "${PIPE_PATH}"`);

  // Log prompt file size
  let promptSize = "unknown";
  try {
    const stats = await stat(config.promptPath);
    promptSize = stats.size.toString();
  } catch (e) {
    // Ignore error
  }

  console.log(`Prompt file size: ${promptSize} bytes`);

  // Log custom environment variables if any
  const customEnvKeys = Object.keys(config.env).filter(
    (key) => key !== "CLAUDE_ACTION_INPUTS_PRESENT",
  );
  if (customEnvKeys.length > 0) {
    console.log(`Custom environment variables: ${customEnvKeys.join(", ")}`);
  }

  // Log custom arguments if any
  if (options.claudeArgs && options.claudeArgs.trim() !== "") {
    console.log(`Custom Claude arguments: ${options.claudeArgs}`);
  }

  // Output to console
  console.log(`Running Claude with prompt from file: ${config.promptPath}`);
  console.log(`Full command: claude ${config.claudeArgs.join(" ")}`);

  // Start sending prompt to pipe in background
  const catProcess = spawn("cat", [config.promptPath], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const pipeStream = createWriteStream(PIPE_PATH);
  catProcess.stdout.pipe(pipeStream);

  catProcess.on("error", (error) => {
    console.error("Error reading prompt file:", error);
    pipeStream.destroy();
  });

  // Use custom executable path if provided, otherwise default to "claude"
  const claudeExecutable = options.pathToClaudeCodeExecutable || "claude";

  const claudeProcess = spawn(claudeExecutable, config.claudeArgs, {
    stdio: ["pipe", "pipe", "inherit"],
    env: {
      ...process.env,
      ...config.env,
    },
  });

  // Handle Claude process errors
  claudeProcess.on("error", (error) => {
    console.error("Error spawning Claude process:", error);
    pipeStream.destroy();
  });

  // Capture output for parsing execution metrics
  let output = "";
  let hasRateLimitError = false;

  claudeProcess.stdout.on("data", (data) => {
    const text = data.toString();

    // Check for rate limit errors (429, throttling, etc.)
    if (
      text.includes("429") ||
      text.includes("Too many requests") ||
      text.includes("rate limit") ||
      text.includes("throttl")
    ) {
      hasRateLimitError = true;
    }

    // Try to parse as JSON and pretty print if it's on a single line
    const lines = text.split("\n");
    lines.forEach((line: string, index: number) => {
      if (line.trim() === "") return;

      try {
        // Check if this line is a JSON object
        const parsed = JSON.parse(line);
        const prettyJson = JSON.stringify(parsed, null, 2);
        process.stdout.write(prettyJson);
        if (index < lines.length - 1 || text.endsWith("\n")) {
          process.stdout.write("\n");
        }
      } catch (e) {
        // Not a JSON object, print as is
        process.stdout.write(line);
        if (index < lines.length - 1 || text.endsWith("\n")) {
          process.stdout.write("\n");
        }
      }
    });

    output += text;
  });

  // Handle stdout errors
  claudeProcess.stdout.on("error", (error) => {
    console.error("Error reading Claude stdout:", error);
  });

  // Pipe from named pipe to Claude
  const pipeProcess = spawn("cat", [PIPE_PATH]);
  pipeProcess.stdout.pipe(claudeProcess.stdin);

  // Handle pipe process errors
  pipeProcess.on("error", (error) => {
    console.error("Error reading from named pipe:", error);
    claudeProcess.kill("SIGTERM");
  });

  // Wait for Claude to finish
  const exitCode = await new Promise<number>((resolve) => {
    claudeProcess.on("close", (code) => {
      resolve(code || 0);
    });

    claudeProcess.on("error", (error) => {
      console.error("Claude process error:", error);
      resolve(1);
    });
  });

  // Clean up processes
  try {
    catProcess.kill("SIGTERM");
  } catch (e) {
    // Process may already be dead
  }
  try {
    pipeProcess.kill("SIGTERM");
  } catch (e) {
    // Process may already be dead
  }

  // Clean up pipe file
  try {
    await unlink(PIPE_PATH);
  } catch (e) {
    // Ignore errors during cleanup
  }

  // Set conclusion based on exit code
  if (exitCode === 0) {
    // Try to process the output and save execution metrics
    try {
      await writeFile("output.txt", output);

      // Process output.txt into JSON and save to execution file
      // Increase maxBuffer from Node.js default of 1MB to 10MB to handle large Claude outputs
      const { stdout: jsonOutput } = await execAsync("jq -s '.' output.txt", {
        maxBuffer: 10 * 1024 * 1024,
      });
      await writeFile(EXECUTION_FILE, jsonOutput);

      console.log(`Log saved to ${EXECUTION_FILE}`);
    } catch (e) {
      core.warning(`Failed to process output for execution metrics: ${e}`);
    }

    core.setOutput("conclusion", "success");
    core.setOutput("execution_file", EXECUTION_FILE);
  } else {
    // If this was a rate limit error, throw to allow retry
    if (hasRateLimitError) {
      throw new Error(
        `Claude CLI failed with rate limit error (exit code ${exitCode})`,
      );
    }

    core.setOutput("conclusion", "failure");

    // Still try to save execution file if we have output
    if (output) {
      try {
        await writeFile("output.txt", output);
        // Increase maxBuffer from Node.js default of 1MB to 10MB to handle large Claude outputs
        const { stdout: jsonOutput } = await execAsync("jq -s '.' output.txt", {
          maxBuffer: 10 * 1024 * 1024,
        });
        await writeFile(EXECUTION_FILE, jsonOutput);
        core.setOutput("execution_file", EXECUTION_FILE);
      } catch (e) {
        // Ignore errors when processing output during failure
      }
    }

    process.exit(exitCode);
  }
}

/**
 * Run Claude with automatic retry on rate limit errors
 *
 * Strategy (per attempt):
 * 1. ALWAYS try AWS Bedrock first (we have credits)
 * 2. If Bedrock returns 429: IMMEDIATELY try Anthropic (no delay)
 * 3. If Anthropic succeeds: done
 * 4. If Anthropic fails (unlikely - we have 20x headroom): done
 * 5. Next attempt: RESET and try Bedrock again
 *
 * NOTE: We have extremely high Anthropic rate limits. Any 429s are ONLY from AWS Bedrock.
 */
export async function runClaudeWithRetry(
  promptPath: string,
  options: ClaudeOptions,
  retryOptions?: {
    maxAttempts?: number;
  },
) {
  const {
    maxAttempts = 5,
  } = retryOptions || {};

  const initialBedrock = process.env.CLAUDE_CODE_USE_BEDROCK === "1";
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  let lastError: Error | undefined;
  let everUsedAnthropic = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // ALWAYS start each attempt with Bedrock if available
    const shouldUseBedrock = initialBedrock;

    if (shouldUseBedrock) {
      process.env.CLAUDE_CODE_USE_BEDROCK = "1";
    }

    try {
      const provider = shouldUseBedrock ? "AWS Bedrock" : "Anthropic API";
      console.log(`\n🤖 Claude execution attempt ${attempt} of ${maxAttempts} (trying ${provider} first)`);
      await runClaude(promptPath, options);
      console.log(`✅ Claude execution succeeded on attempt ${attempt} using ${provider}`);
      return; // Success!
    } catch (bedrockError) {
      lastError = bedrockError instanceof Error ? bedrockError : new Error(String(bedrockError));

      // Only handle rate limit errors
      if (!lastError.message.includes("rate limit")) {
        // Not a rate limit error, don't retry
        throw lastError;
      }

      console.error(
        `⚠️  ${shouldUseBedrock ? 'AWS Bedrock' : 'Anthropic API'} rate limited: ${lastError.message}`,
      );

      // If Bedrock failed with 429 and we have Anthropic key, try Anthropic immediately
      if (shouldUseBedrock && hasAnthropicKey) {
        console.log(
          `🔄 Trying Anthropic API immediately (no delay - we have 20x headroom)...`,
        );

        // Switch to Anthropic for THIS attempt only
        process.env.CLAUDE_CODE_USE_BEDROCK = "0";
        delete process.env.AWS_BEARER_TOKEN_BEDROCK;
        everUsedAnthropic = true;

        try {
          await runClaude(promptPath, options);
          console.log(`✅ Claude execution succeeded on attempt ${attempt} using Anthropic API (failover)`);
          return; // Success with Anthropic!
        } catch (anthropicError) {
          lastError = anthropicError instanceof Error ? anthropicError : new Error(String(anthropicError));

          if (lastError.message.includes("rate limit")) {
            console.warn(
              `⚠️  Unexpected: Anthropic API also rate limited (we have 20x headroom)`,
            );
          } else {
            // Not a rate limit error from Anthropic, throw it
            throw lastError;
          }
        }
      }

      // Both Bedrock and Anthropic failed (or no Anthropic key), continue to next attempt
      if (attempt < maxAttempts) {
        console.log(`🔄 Both providers failed, trying again from Bedrock (attempt ${attempt + 1})...`);
      }
    }
  }

  console.error(
    `❌ Claude execution failed after ${maxAttempts} attempts due to rate limiting`,
  );
  if (everUsedAnthropic) {
    console.error(
      `   Attempted both AWS Bedrock and Anthropic API - both rate limited`,
    );
  }
  throw lastError;
}
