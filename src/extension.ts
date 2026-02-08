import * as vscode from "vscode";

interface LinkConfig {
  label: string;
  url: string;
}

interface Rule {
  pattern: string;
  links: LinkConfig[];
}

interface MatchedTerminalLink extends vscode.TerminalLink {
  data: string;
  links: LinkConfig[];
}

function getRules(): Rule[] {
  return vscode.workspace
    .getConfiguration("multiDestinationLinker")
    .get<Rule[]>("rules", []);
}

async function openLink(url: string, matchedText: string) {
  const resolved = url.replace(/\$1/g, matchedText);
  await vscode.env.openExternal(vscode.Uri.parse(resolved));
}

export function activate(context: vscode.ExtensionContext) {
  const provider: vscode.TerminalLinkProvider<MatchedTerminalLink> = {
    provideTerminalLinks(terminalContext) {
      const rules = getRules();
      const linkMap = new Map<string, MatchedTerminalLink>();

      for (const rule of rules) {
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
          const captured = match[1] ?? match[0];
          const key = `${match.index}:${match[0].length}`;

          const existing = linkMap.get(key);
          if (existing) {
            existing.links.push(...rule.links);
            existing.tooltip = existing.links.map((l) => l.label).join(" / ");
          } else {
            linkMap.set(key, {
              startIndex: match.index,
              length: match[0].length,
              tooltip: rule.links.map((l) => l.label).join(" / "),
              data: captured,
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
        await openLink(link.links[0].url, link.data);
        return;
      }
      const picked = await vscode.window.showQuickPick(
        link.links.map((l) => ({ label: l.label, url: l.url })),
        { placeHolder: `Open "${link.data}" with...` }
      );
      if (picked) {
        await openLink(picked.url, link.data);
      }
    },
  };

  context.subscriptions.push(
    vscode.window.registerTerminalLinkProvider(provider)
  );
}

export function deactivate() {}
