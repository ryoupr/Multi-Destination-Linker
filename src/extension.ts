import * as vscode from "vscode";

interface LinkConfig {
  label: string;
  url: string;
}

interface MatchedTerminalLink extends vscode.TerminalLink {
  data: string;
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("multiDestinationLinker");
  return {
    pattern: cfg.get<string>("pattern", "([A-Z][A-Z0-9]+-\\d+)"),
    links: cfg.get<LinkConfig[]>("links", []),
  };
}

async function openLink(url: string, matchedText: string) {
  const resolved = url.replace(/\$1/g, matchedText);
  await vscode.env.openExternal(vscode.Uri.parse(resolved));
}

export function activate(context: vscode.ExtensionContext) {
  const provider: vscode.TerminalLinkProvider<MatchedTerminalLink> = {
    provideTerminalLinks(terminalContext) {
      const { pattern } = getConfig();
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "g");
      } catch {
        return [];
      }

      const links: MatchedTerminalLink[] = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(terminalContext.line)) !== null) {
        const captured = match[1] ?? match[0];
        links.push({
          startIndex: match.index,
          length: match[0].length,
          tooltip: "Open issue link",
          data: captured,
        });
      }
      return links;
    },

    async handleTerminalLink(link: MatchedTerminalLink) {
      const { links } = getConfig();
      if (links.length === 0) {
        return;
      }
      if (links.length === 1) {
        await openLink(links[0].url, link.data);
        return;
      }
      const picked = await vscode.window.showQuickPick(
        links.map((l) => ({ label: l.label, url: l.url })),
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
