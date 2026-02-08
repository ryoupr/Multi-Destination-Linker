import * as vscode from "vscode";

interface LinkConfig {
  label: string;
  url: string;
}

interface Rule {
  pattern: string;
  tooltip?: string;
  links: LinkConfig[];
}

interface MatchedTerminalLink extends vscode.TerminalLink {
  data: RegExpExecArray;
  links: LinkConfig[];
}

function getRules(): Rule[] {
  return vscode.workspace
    .getConfiguration("multiDestinationLinker")
    .get<Rule[]>("rules", []);
}

function resolveUrl(url: string, match: RegExpExecArray): string {
  return url.replace(/\$(\d+)/g, (_, i) => match[Number(i)] ?? "");
}

function showSetupGuide() {
  vscode.window
    .showInformationMessage(
      "Multi-Destination-Linker: No rules configured.",
      "Add Rule",
      "Open Settings"
    )
    .then((choice) => {
      if (choice === "Add Rule") {
        vscode.commands.executeCommand("multiDestinationLinker.addRule");
      } else if (choice === "Open Settings") {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "multiDestinationLinker.rules"
        );
      }
    });
}

async function addRuleWizard() {
  // 1. Pattern
  const pattern = await vscode.window.showInputBox({
    prompt: "Regex pattern (e.g. ([A-Z][A-Z0-9]+-\\d+) )",
    placeHolder: "([A-Z][A-Z0-9]+-\\d+)",
    validateInput(value) {
      try {
        new RegExp(value);
        return null;
      } catch (e) {
        return `Invalid regex: ${e instanceof Error ? e.message : e}`;
      }
    },
  });
  if (!pattern) return;

  // 2. Links (loop)
  const links: LinkConfig[] = [];
  while (true) {
    const label = await vscode.window.showInputBox({
      prompt: `Link ${links.length + 1}: Label (e.g. "Open in Jira")`,
      placeHolder: "Open in Jira",
    });
    if (!label) break;

    const url = await vscode.window.showInputBox({
      prompt: `Link ${links.length + 1}: URL ($0=full match, $1=group1)`,
      placeHolder: "https://example.atlassian.net/browse/$1",
    });
    if (!url) break;

    links.push({ label, url });

    const more = await vscode.window.showQuickPick(["Add another link", "Done"], {
      placeHolder: "Add another link to this rule?",
    });
    if (more !== "Add another link") break;
  }

  if (links.length === 0) return;

  // 3. Save
  const config = vscode.workspace.getConfiguration("multiDestinationLinker");
  const rules = [...getRules(), { pattern, links }];
  await config.update("rules", rules, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(
    `Rule added: "${pattern}" → ${links.length} link(s)`
  );
}

export function activate(context: vscode.ExtensionContext) {
  const rules = getRules();
  if (rules.length === 0) {
    showSetupGuide();
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("multiDestinationLinker.addRule", addRuleWizard)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("multiDestinationLinker.rules")) {
        if (getRules().length === 0) {
          showSetupGuide();
        }
      }
    })
  );

  const provider: vscode.TerminalLinkProvider<MatchedTerminalLink> = {
    provideTerminalLinks(terminalContext) {
      const currentRules = getRules();
      const linkMap = new Map<string, MatchedTerminalLink>();

      for (const rule of currentRules) {
        let regex: RegExp;
        try {
          regex = new RegExp(rule.pattern, "g");
        } catch (e) {
          vscode.window.showWarningMessage(
            `Multi-Destination-Linker: Invalid regex "${rule.pattern}": ${e instanceof Error ? e.message : e}`
          );
          continue;
        }

        let match: RegExpExecArray | null;
        while ((match = regex.exec(terminalContext.line)) !== null) {
          const key = `${match.index}:${match[0].length}`;
          const existing = linkMap.get(key);
          if (existing) {
            existing.links.push(...rule.links);
            if (!rule.tooltip) {
              existing.tooltip = existing.links.map((l) => l.label).join(" / ");
            }
          } else {
            linkMap.set(key, {
              startIndex: match.index,
              length: match[0].length,
              tooltip:
                rule.tooltip ?? rule.links.map((l) => l.label).join(" / "),
              data: match,
              links: [...rule.links],
            });
          }
        }
      }
      return [...linkMap.values()];
    },

    async handleTerminalLink(link: MatchedTerminalLink) {
      if (link.links.length === 0) {
        return;
      }
      if (link.links.length === 1) {
        const url = resolveUrl(link.links[0].url, link.data);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        return;
      }
      const picked = await vscode.window.showQuickPick(
        link.links.map((l) => ({ label: l.label, url: l.url })),
        { placeHolder: `Open "${link.data[1] ?? link.data[0]}" with...` }
      );
      if (picked) {
        const url = resolveUrl(picked.url, link.data);
        await vscode.env.openExternal(vscode.Uri.parse(url));
      }
    },
  };

  context.subscriptions.push(
    vscode.window.registerTerminalLinkProvider(provider)
  );
}

export function deactivate() {}
