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
      "Open Settings"
    )
    .then((choice) => {
      if (choice) {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "multiDestinationLinker.rules"
        );
      }
    });
}

export function activate(context: vscode.ExtensionContext) {
  const rules = getRules();
  if (rules.length === 0) {
    showSetupGuide();
  }

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
