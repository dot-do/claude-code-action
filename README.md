![Claude Code Action responding to a comment](https://github.com/user-attachments/assets/1d60c2e9-82ed-4ee5-b749-f9e021c85f4d)

# Claude Code Action 🇦🇺

G'day mate! This is a fair dinkum [Claude Code](https://claude.ai/code) action for GitHub PRs and issues that'll help you out with questions and implement code changes like a proper legend. This ripper of an action is smart enough to know when to jump in based on your workflow context—whether you're giving it a bell with @claude mentions, chucking it an issue assignment, or running automation tasks with explicit prompts. She'll work with multiple authentication methods including Anthropic direct API, Amazon Bedrock, and Google Vertex AI. Beauty!

## What's the Go? (Features)

- 🎯 **Smart as a Whip Mode Detection**: Automatically picks the right execution mode based on your workflow context—no mucking about with config needed
- 🤖 **Interactive Code Mate**: Claude's your coding buddy who can answer questions about code, architecture, and programming like nobody's business
- 🔍 **Code Review Champion**: Takes a squiz at your PR changes and suggests improvements that'll knock your socks off
- ✨ **Code Implementation Wizard**: Can bang out simple fixes, refactoring, and even new features faster than you can say "Bob's your uncle"
- 💬 **PR/Issue Integration Bonza**: Works like a dream with GitHub comments and PR reviews
- 🛠️ **Flexible Tool Access**: Gets stuck into GitHub APIs and file operations (additional tools can be cranked up via configuration)
- 📋 **Progress Tracking Beaut**: Visual progress indicators with checkboxes that update dynamically as Claude smashes through tasks
- 🏃 **Runs on Your Turf**: The action runs entirely on your own GitHub runner (Anthropic API calls go to your chosen provider)
- ⚙️ **No-Fuss Configuration**: Unified `prompt` and `claude_args` inputs provide clean, powerful configuration that's aligned with Claude Code SDK

## 📦 Moving House from v0.x?

**Chuck a look at our [Migration Guide](./docs/migration-guide.md)** for step-by-step instructions on updating your workflows to v1.0. The new version makes configuration a piece of piss while keeping things sweet with most existing setups.

## Getting Started (Quick Smart!)

The easiest way to get this action up and running is through [Claude Code](https://claude.ai/code) in the terminal. Just fire up `claude` and run `/install-github-app`.

This little beauty will walk you through setting up the GitHub app and all the secrets you need.

**Fair Warning**:

- You'll need to be a repository admin to install the GitHub app and add secrets (no worries if you're the boss!)
- This quickstart method is only for direct Anthropic API users. If you're using AWS Bedrock or Google Vertex AI, have a sticky beak at [docs/cloud-providers.md](./docs/cloud-providers.md).

## 📚 Solutions & Ripper Use Cases

Looking for specific automation patterns? Have a captain cook at our **[Solutions Guide](./docs/solutions.md)** for complete working examples including:

- **🔍 Automatic PR Code Review** - Full review automation that's the cat's pyjamas
- **📂 Path-Specific Reviews** - Triggers when critical files get a touch-up
- **👥 External Contributor Reviews** - Special treatment for the new kids on the block
- **📝 Custom Review Checklists** - Keep your team standards tighter than a fish's backside
- **🔄 Scheduled Maintenance** - Automated repository health checks that run like clockwork
- **🏷️ Issue Triage & Labeling** - Automatic categorization that sorts things faster than a sheepdog
- **📖 Documentation Sync** - Keeps docs updated with code changes, no dramas
- **🔒 Security-Focused Reviews** - OWASP-aligned security analysis that's tough as nails
- **📊 DIY Progress Tracking** - Create tracking comments in automation mode

Each solution comes with the full monty—working examples, configuration details, and what you can expect to see.

## The Good Oil (Documentation)

- **[Solutions Guide](./docs/solutions.md)** - **🎯 Ready-to-go automation patterns that'll make you smile**
- **[Migration Guide](./docs/migration-guide.md)** - **⭐ Moving up from v0.x to v1.0**
- [Setup Guide](./docs/setup.md) - Manual setup, custom GitHub apps, and security best practices (for the keen beans)
- [Usage Guide](./docs/usage.md) - Basic usage, workflow configuration, and input parameters (the bread and butter)
- [Custom Automations](./docs/custom-automations.md) - Examples of automated workflows and custom prompts that'll blow your mind
- [Configuration](./docs/configuration.md) - MCP servers, permissions, environment variables, and advanced settings (for the tech heads)
- [Experimental Features](./docs/experimental.md) - Execution modes and network restrictions (cutting edge stuff)
- [Cloud Providers](./docs/cloud-providers.md) - AWS Bedrock and Google Vertex AI setup (for the cloud cowboys)
- [Capabilities & Limitations](./docs/capabilities-and-limitations.md) - What Claude can and can't do (keeping it real)
- [Security](./docs/security.md) - Access control, permissions, and commit signing (locked up tight)
- [FAQ](./docs/faq.md) - Common questions and troubleshooting (when things go pear-shaped)

## 📚 Got Questions? She'll Be Right!

Having a bit of trouble or got some questions rattling around? Have a gander at our [Frequently Asked Questions](./docs/faq.md) for solutions to common problems and detailed explanations of what Claude can and can't do. No worries, mate!

## License

This project is licensed under the MIT License—have a squiz at the LICENSE file for all the nitty-gritty details.
