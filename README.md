# Multi-Destination-Linker

VSCode拡張機能。ターミナル上のテキストを正規表現で検出しリンク化、クリック時にQuickPickで複数の遷移先から選択してブラウザで開きます。

## インストール

- VSCode の拡張機能パネルで `Multi-Destination-Linker` を検索してインストール
- または: [Marketplace ページ](https://marketplace.visualstudio.com/items?itemName=ryoupr.multi-destination-linker) からインストール
- またはコマンドラインから:
```bash
code --install-extension ryoupr.multi-destination-linker
```

## 機能

- ターミナル出力から正規表現にマッチするテキストを自動検出しリンク表示
- クリック時にQuickPickで遷移先を選択
- 遷移先が1つの場合は直接ブラウザで開く
- 複数のパターンを定義し、それぞれに異なる遷移先を設定可能
- 正規表現・遷移先は `settings.json` で自由にカスタマイズ可能

## 設定

`settings.json` に以下を追加してください:

```json
{
  "multiDestinationLinker.rules": [
    {
      "pattern": "([A-Z][A-Z0-9]+-\\d+)",
      "links": [
        { "label": "Jiraで開く", "url": "https://your-domain.atlassian.net/browse/$1" },
        { "label": "Backlogで開く", "url": "https://your-space.backlog.jp/view/$1" }
      ]
    },
    {
      "pattern": "(#\\d+)",
      "links": [
        { "label": "GitHub PRで開く", "url": "https://github.com/your-org/your-repo/pull/$1" }
      ]
    }
  ]
}
```

| 設定キー | 説明 |
|---|---|
| `multiDestinationLinker.rules` | パターンと遷移先のルール配列 |
| `rules[].pattern` | テキスト検出用の正規表現。キャプチャグループ `$1` がURLに埋め込まれます |
| `rules[].links` | 遷移先の配列。`label` はQuickPickの表示名、`url` は開くURL |

## 活用例

- 課題キー（`PROJ-123`）→ Jira / Backlog で開く
- PR番号（`#456`）→ GitHub / GitLab で開く
- エラーコード → 社内Wiki / Stack Overflow で検索
- ドメイン名 → 本番環境 / ステージング環境で開く

## 使い方

1. 上記の設定を `settings.json` に追加
2. ターミナルでパターンにマッチするテキストが表示されると自動的にリンクになる
3. リンクをクリック（またはCtrl/Cmd+クリック）
4. 遷移先が複数ある場合はQuickPickから選択
5. ブラウザで該当ページが開く

## 開発

```bash
npm install
npm run compile
# F5 で Extension Development Host を起動して動作確認
```
