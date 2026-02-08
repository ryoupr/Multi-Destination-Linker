# Multi-Destination-Linker

VSCode拡張機能。ターミナル上の課題キー（Jira, Backlog等）をクリックし、複数の遷移先からQuickPickで選択してブラウザで開きます。

## 機能

- ターミナル出力から課題キー（例: `PROJ-123`）を自動検出しリンク表示
- クリック時にQuickPickで遷移先を選択
- 遷移先が1つの場合は直接ブラウザで開く
- 正規表現・遷移先は `settings.json` で自由にカスタマイズ可能

## 設定

`settings.json` に以下を追加してください:

```json
{
  "multiDestinationLinker.pattern": "([A-Z][A-Z0-9]+-\\d+)",
  "multiDestinationLinker.links": [
    {
      "label": "Jiraで開く",
      "url": "https://your-domain.atlassian.net/browse/$1"
    },
    {
      "label": "Backlogで開く",
      "url": "https://your-space.backlog.jp/view/$1"
    }
  ]
}
```

| 設定キー | 説明 |
|---|---|
| `multiDestinationLinker.pattern` | 課題キー検出用の正規表現。`$1`（キャプチャグループ）がURLに埋め込まれます |
| `multiDestinationLinker.links` | 遷移先の配列。`label` はQuickPickの表示名、`url` は開くURL |

## 使い方

1. 上記の設定を `settings.json` に追加
2. ターミナルで課題キーが表示されると自動的にリンクになる
3. リンクをクリック（またはCtrl/Cmd+クリック）
4. 遷移先が複数ある場合はQuickPickから選択
5. ブラウザで該当ページが開く

## 開発

```bash
npm install
npm run compile
# F5 で Extension Development Host を起動して動作確認
```
