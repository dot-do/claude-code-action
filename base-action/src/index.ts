#!/usr/bin/env bun

import * as core from "@actions/core";
import { preparePrompt } from "./prepare-prompt";
import { runClaudeWithRetry } from "./run-claude";
import { setupClaudeCodeSettings } from "./setup-claude-code-settings";
import { validateEnvironmentVariables } from "./validate-env";
import { startProxyServer, getProxyUrl, shouldUseProxy } from "./proxy-server";

async function run() {
  try {
    validateEnvironmentVariables();

    // Start local HTTP proxy server for claude-lb (supports multiple modes)
    const proxyPort = await startProxyServer();

    // Only route through proxy if credentials are available
    if (shouldUseProxy()) {
      process.env.ANTHROPIC_BASE_URL = getProxyUrl();
      console.log(`\n🔀 Claude API requests routed through claude-lb proxy`);
      console.log(`   Benefits: Centralized monitoring, observability, and multi-provider failover`);
    } else {
      console.log(`\n⚡️ Using direct Anthropic API (no proxy)`);
      console.log(`   To enable monitoring, set ANTHROPIC_API_KEY in secrets`);
    }

    await setupClaudeCodeSettings(
      process.env.INPUT_SETTINGS,
      undefined, // homeDir
    );

    const promptConfig = await preparePrompt({
      prompt: process.env.INPUT_PROMPT || "",
      promptFile: process.env.INPUT_PROMPT_FILE || "",
    });

    await runClaudeWithRetry(promptConfig.path, {
      claudeArgs: process.env.INPUT_CLAUDE_ARGS,
      allowedTools: process.env.INPUT_ALLOWED_TOOLS,
      disallowedTools: process.env.INPUT_DISALLOWED_TOOLS,
      maxTurns: process.env.INPUT_MAX_TURNS,
      mcpConfig: process.env.INPUT_MCP_CONFIG,
      systemPrompt: process.env.INPUT_SYSTEM_PROMPT,
      appendSystemPrompt: process.env.INPUT_APPEND_SYSTEM_PROMPT,
      claudeEnv: process.env.INPUT_CLAUDE_ENV,
      fallbackModel: process.env.INPUT_FALLBACK_MODEL,
      model: process.env.ANTHROPIC_MODEL,
      pathToClaudeCodeExecutable:
        process.env.INPUT_PATH_TO_CLAUDE_CODE_EXECUTABLE,
    });
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    core.setOutput("conclusion", "failure");
    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}
