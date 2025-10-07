![Claude Code Action responding to a comment](https://github.com/user-attachments/assets/1d60c2e9-82ed-4ee5-b749-f9e021c85f4d)

# Claude Code Action

G'day! This ripper of a [Claude Code](https://claude.ai/code) action for GitHub PRs and issues is fair dinkum brilliant at answering your questions and implementing code changes. This beauty intelligently sussess out when to kick into gear based on your workflow context—whether it's responding to @claude mentions, issue assignments, or executing automation tasks with explicit prompts. She'll work with multiple authentication methods including Anthropic direct API, Amazon Bedrock, and Google Vertex AI, no worries mate!

## What This Little Beauty Can Do

- 🎯 **Smart as a Whip Mode Detection**: Automatically picks the right execution mode based on your workflow context—she's got it sorted, no configuration needed mate
- 🤖 **Top-Notch Code Mate**: Claude can answer questions about code, architecture, and programming like a proper legend
- 🔍 **Code Review Champion**: Analyses PR changes and suggests improvements that'll knock your socks off
- ✨ **Code Implementation Wizard**: Can implement bonzer fixes, refactoring, and even new features
- 💬 **PR/Issue Integration That's Sweet as**: Works seamlessly with GitHub comments and PR reviews
- 🛠️ **Flexible Tool Access**: Access to GitHub APIs and file operations (additional tools can be enabled via configuration—she's versatile!)
- 📋 **Progress Tracking That's the Bee's Knees**: Visual progress indicators with checkboxes that dynamically update as Claude gets the job done
- 🏃 **Runs on Your Own Patch**: The action executes entirely on your own GitHub runner (Anthropic API calls go to your chosen provider)
- ⚙️ **Configuration So Simple It's Brilliant**: Unified `prompt` and `claude_args` inputs provide clean, powerful configuration aligned with Claude Code SDK

## 📦 Upgrading from v0.x?

**Check out our [Migration Guide](./docs/migration-guide.md)** for bonzer step-by-step instructions on updating your workflows to v1.0. The new version simplifies configuration while keeping things compatible with most existing setups—no dramas!

## Getting Started (She'll Be Right!)

The easiest way to get this beauty up and running is through [Claude Code](https://claude.ai/code) in the terminal. Just fire up `claude` and run `/install-github-app`.

This ripper command will walk you through setting up the GitHub app and all the required secrets—easy as!

**Fair Warning**:

- You'll need to be a repository admin to install the GitHub app and add secrets (no choice there, mate)
- This quickstart method is only for direct Anthropic API users. For AWS Bedrock or Google Vertex AI setup, have a squiz at [docs/cloud-providers.md](./docs/cloud-providers.md).

## 📚 Solutions & Use Cases (The Good Stuff!)

Looking for specific automation patterns? Chuck a look at our **[Solutions Guide](./docs/solutions.md)** for bonzer working examples including:

- **🔍 Automatic PR Code Review** - Full review automation that's ace
- **📂 Path-Specific Reviews** - Trigger on critical file changes (smart as!)
- **👥 External Contributor Reviews** - Special handling for new contributors (fair dinkum helpful)
- **📝 Custom Review Checklists** - Enforce team standards like a boss
- **🔄 Scheduled Maintenance** - Automated repository health checks (keeping things shipshape)
- **🏷️ Issue Triage & Labeling** - Automatic categorization that's bloody brilliant
- **📖 Documentation Sync** - Keep docs updated with code changes (no more stale docs!)
- **🔒 Security-Focused Reviews** - OWASP-aligned security analysis (safe as houses)
- **📊 DIY Progress Tracking** - Create tracking comments in automation mode

Each solution includes complete working examples, configuration details, and expected outcomes—everything you need to get cracking!

## Documentation (All The Good Oil)

- **[Solutions Guide](./docs/solutions.md)** - **🎯 Ready-to-use automation patterns (the real McCoy!)**
- **[Migration Guide](./docs/migration-guide.md)** - **⭐ Upgrading from v0.x to v1.0 (no worries!)**
- [Setup Guide](./docs/setup.md) - Manual setup, custom GitHub apps, and security best practices (sorted!)
- [Usage Guide](./docs/usage.md) - Basic usage, workflow configuration, and input parameters (easy as pie)
- [Custom Automations](./docs/custom-automations.md) - Examples of automated workflows and custom prompts (get creative!)
- [Configuration](./docs/configuration.md) - MCP servers, permissions, environment variables, and advanced settings (all the nuts and bolts)
- [Experimental Features](./docs/experimental.md) - Execution modes and network restrictions (cutting edge stuff)
- [Cloud Providers](./docs/cloud-providers.md) - AWS Bedrock and Google Vertex AI setup (cloud nine!)
- [Capabilities & Limitations](./docs/capabilities-and-limitations.md) - What Claude can and cannot do (the honest truth)
- [Security](./docs/security.md) - Access control, permissions, and commit signing (locked down tight)
- [FAQ](./docs/faq.md) - Common questions and troubleshooting (when things go pear-shaped)

## 📚 FAQ (Got Questions?)

Running into troubles or got questions? Have a geez at our [Frequently Asked Questions](./docs/faq.md) for solutions to common problems and detailed explanations of Claude's capabilities and limitations. She'll sort you right out!

## License

This project is licensed under the MIT License—check out the LICENSE file for all the legal bits and bobs.
