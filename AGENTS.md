# AI Agent Development Instructions

## Mandatory canonical development rules

This repository is governed by the canonical AI development rules published at:

`https://github.com/Sokrates1989/coding-guidelines`

Before modifying repository files, running commands with side effects, committing, or performing other implementation work, you MUST load and follow the applicable rules.

## Ruleset discovery

Use the following order. Prefer an already available trustworthy local copy; use the canonical GitHub repository only when no suitable local copy is available.

### 1. Prefer a trustworthy local copy

Check obvious workspace or sibling locations and any explicitly configured path for a local clone or copy of `Sokrates1989/coding-guidelines`. On the maintainer's normal Windows development environment, a common location is:

`D:\Development\Code\coding-guidelines`

Do not perform broad filesystem scans through unrelated or sensitive directories merely to find the rules.

The operational entry point is:

`ai-agent-dev-rules.md`

When the candidate is a Git clone, verify that its configured remote identifies `github.com/Sokrates1989/coding-guidelines` before treating it as the canonical ruleset. Use the currently checked-out revision consistently for the complete agent run.

MUST NOT fetch, pull, switch, reset, or otherwise update an existing local rules clone during an active task unless the user explicitly requests it.

### 2. Fall back to the canonical GitHub repository

If no trustworthy local copy is available, obtain the rules from:

`https://github.com/Sokrates1989/coding-guidelines`

Resolve the current `main` branch to one commit SHA first. Read every required rule page from that exact revision so one run never mixes ruleset revisions.

A cloud or otherwise isolated agent MAY create a temporary read-only or shallow clone outside this repository, preferably in the environment's temporary area, solely to read the rules. It MUST NOT add the rules repository as a submodule, vendor it into this repository, or modify the canonical rules repository unless explicitly requested.

### 3. Recover from blocked access methods before failing closed

Failure of one access method does not by itself mean the canonical ruleset is inaccessible.

When no trustworthy local copy exists:

1. Prefer read-only access to the canonical GitHub repository.
2. If Git smart-HTTP operations such as `git ls-remote` or `git clone` are blocked, try read-only alternatives before declaring the rules inaccessible:
   - use `https://api.github.com` to resolve the current `main` commit SHA;
   - use `https://raw.githubusercontent.com` to read `ai-agent-dev-rules.md` and every required rule page from that exact SHA.
3. Do not request broader network permissions or write-capable HTTP methods merely to make Git transport work when read-only API/raw access is sufficient.

If the rules still cannot be accessed, stop before side effects and tell the user:

- which source and access methods were attempted;
- the exact failure;
- which agent platform or environment is running, when known;
- the smallest security or configuration change that would provide read-only access.

For Codex Cloud, recommend enabling **Agent Internet Access** for the repository environment with only these additional allowed domains:

`github.com, api.github.com, raw.githubusercontent.com`

When HTTP-method restrictions are available, recommend only:

`GET, HEAD, OPTIONS`

Also tell the user to save the environment, reset its setup cache, and start a new task so the updated environment policy is applied.

For a local agent, recommend pointing the agent to an existing trustworthy local clone, or creating/updating that clone between agent runs.

For another isolated cloud agent, recommend granting read-only HTTPS access to the canonical GitHub sources or mounting/providing a trustworthy local copy.

Never recommend unrestricted internet access when narrower read-only access is sufficient.

### 4. Load only the applicable rules

1. Read `ai-agent-dev-rules.md` from the selected local or remote-backed revision.
2. Treat it as the root rules router.
3. Follow its rule-selection procedure.
4. Load only pages applicable to the current repository, task, files, languages, frameworks, repository type, and workflows.
5. Recursively load every applicable `Required pages` dependency before governed work begins.
6. Do not rely on model memory, cached summaries, or assumptions about the rules.

## Fail closed

If neither a trustworthy local copy nor the canonical GitHub rules can be accessed, or if a required rule page cannot be read, STOP before modifying repository files or performing side effects.

Report the inaccessible resource and reason. Do not silently continue without the required rules.

## Authority

System, platform, security, tool, and explicit current-user instructions retain their normal authority. Repository-specific instructions may supplement or override broader canonical rules only according to the precedence model defined by the canonical ruleset.

## Completion evidence

For every file-changing task, report:

- whether the coding guidelines were loaded from a local copy or via the canonical GitHub fallback;
- the coding-guidelines commit SHA or otherwise identifiable revision used;
- the ruleset version;
- the Rule IDs actually loaded;
- the validation actually performed.

Never claim compliance with a rule page that was not read.

## Repository-specific instructions

No additional repository-specific AI-agent instructions are defined here. Follow the repository evidence and all applicable canonical rules, including Thunderbird-extension rules when triggered.
