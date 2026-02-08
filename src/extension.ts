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
      const results: MatchedTerminalLink[] = [];

      for (const rule of rules) {
        let regex: RegExp;
        try {
          regex = new RegExp(rule.pattern, "g");
        } catch {
          continue;
        }

        let match: RegExpExecArray | null;
        while ((match = regex.exec(terminalContext.line)) !== null) {
          const captured = match[1] ?? match[0];
          results.push({
            startIndex: match.index,
            length: match[0].length,
            tooltip: "Open link",
            data: captured,
            links: rule.links,
          });
        }
      }
      return results;
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
        { placeHolder: `${link.data} をどこで開きますか？` }
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
