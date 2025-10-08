![Claude Code Action responding to a comment](https://github.com/user-attachments/assets/1d60c2e9-82ed-4ee5-b749-f9e021c85f4d)

# Claude Code Action

*Fáilte!* Welcome to the friendliest [Claude Code](https://claude.ai/code) action this side of the Atlantic! This grand little action for GitHub PRs and issues is as handy as a pocket on a shirt - answering your questions and implementing code changes like nobody's business. Sure, it's clever enough to know when to jump in based on your workflow context—whether you're giving it a shout with @claude mentions, assigning issues, or running automation tasks with explicit prompts. And wouldn't you know it, it works with multiple authentication methods including Anthropic direct API, Amazon Bedrock, and Google Vertex AI. *Go raibh maith agat* for choosing this action!

## What Makes This Action Pure Class

- 🎯 **Smart as a Whip**: Automatically picks the right execution mode based on your workflow context—no faffing about with configuration needed, *fair play*!
- 🤖 **Your Grand Code Companion**: Claude's a dab hand at answering questions about code, architecture, and programming - like having a wise old uncle who knows his stuff
- 🔍 **Eagle-Eyed Code Review**: Takes a gander at your PR changes and suggests improvements that'd make your mammy proud
- ✨ **Code Implementation Wizard**: Can implement simple fixes, refactoring, and even new features faster than you can say "sláinte"
- 💬 **Smooth as Butter Integration**: Works like a dream with GitHub comments and PR reviews
- 🛠️ **Handy Tool Access**: Gets at GitHub APIs and file operations (sure, you can enable more tools if you fancy)
- 📋 **Keeps You in the Loop**: Visual progress indicators with checkboxes that update as Claude gets the job done
- 🏃 **Runs on Your Own Turf**: The action runs entirely on your own GitHub runner (Anthropic API calls go where you tell them to)
- ⚙️ **Dead Simple Setup**: Unified `prompt` and `claude_args` inputs make configuration as easy as Sunday morning

## 📦 Moving Up from v0.x, Are Ya?

**Have a look at our [Migration Guide](./docs/migration-guide.md)** for step-by-step instructions on updating your workflows to v1.0. The new version makes configuration a doddle while keeping things working with most existing setups - *Bob's your uncle!*

## Getting Started (It's Grand, Really!)

The handiest way to set up this action is through [Claude Code](https://claude.ai/code) in the terminal. Just fire up `claude` and run `/install-github-app`.

This command will walk you through setting up the GitHub app and required secrets - sure it's as easy as boiling water!

**Mind yourself now**:

- You'll need to be a repository admin to install the GitHub app and add secrets (*no getting around that one*)
- This quickstart method is only for direct Anthropic API users. If you're using AWS Bedrock or Google Vertex AI, pop over to [docs/cloud-providers.md](./docs/cloud-providers.md) - they'll sort you right out.

## 📚 Brilliant Solutions & Ways to Use This Craic

Looking for specific automation patterns, are ya? Check our **[Solutions Guide](./docs/solutions.md)** - it's packed with complete working examples that'll have you sorted:

- **🔍 Automatic PR Code Review** - Full review automation that's the bee's knees
- **📂 Path-Specific Reviews** - Triggers when critical files change (sharp as a tack!)
- **👥 External Contributor Reviews** - Special handling for new contributors (*céad míle fáilte* to them!)
- **📝 Custom Review Checklists** - Keep your team standards tight as a drum
- **🔄 Scheduled Maintenance** - Automated repository health checks that never sleep
- **🏷️ Issue Triage & Labeling** - Automatic categorization faster than you can say "Tánaiste"
- **📖 Documentation Sync** - Keeps docs updated with code changes like clockwork
- **🔒 Security-Focused Reviews** - OWASP-aligned security analysis that's sound as a pound
- **📊 DIY Progress Tracking** - Create tracking comments in automation mode

Each solution comes with the full shebang - working examples, configuration details, and what you can expect. *Níl aon tinteán mar do thinteán féin* (there's no place like home), and these solutions will make your repository feel just like that!

## The Full Library (Everything You Need to Know!)

- **[Solutions Guide](./docs/solutions.md)** - **🎯 Ready-to-use automation patterns that'll knock your socks off**
- **[Migration Guide](./docs/migration-guide.md)** - **⭐ Moving from v0.x to v1.0 without breaking a sweat**
- [Setup Guide](./docs/setup.md) - Manual setup, custom GitHub apps, and security best practices (*sure, we've got you covered*)
- [Usage Guide](./docs/usage.md) - Basic usage, workflow configuration, and input parameters - the bread and butter stuff
- [Custom Automations](./docs/custom-automations.md) - Examples of automated workflows and custom prompts that'll make your life easier
- [Configuration](./docs/configuration.md) - MCP servers, permissions, environment variables, and all the fancy advanced settings
- [Experimental Features](./docs/experimental.md) - Execution modes and network restrictions for the adventurous types
- [Cloud Providers](./docs/cloud-providers.md) - AWS Bedrock and Google Vertex AI setup (*for those who like their clouds with a bit of style*)
- [Capabilities & Limitations](./docs/capabilities-and-limitations.md) - What Claude can and cannot do (we're keeping it real here)
- [Security](./docs/security.md) - Access control, permissions, and commit signing (*safe as houses*)
- [FAQ](./docs/faq.md) - Common questions and troubleshooting for when things go a bit sideways

## 📚 Questions? We've Got Answers!

Having a bit of trouble or just curious about something? Take a gander at our [Frequently Asked Questions](./docs/faq.md) for solutions to common problems and detailed explanations of Claude's capabilities and limitations. Sure, we've probably answered it already - *great minds think alike!*

## License

This project is licensed under the MIT License—see the LICENSE file for all the legal bits and bobs. *Slán go fóill!* (goodbye for now!)
