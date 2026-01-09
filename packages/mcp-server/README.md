# Building OS MCP Server

Building OS APIをMCPサーバー経由で提供し、AIエージェントがビル管理機能を利用できるようにするシステムです。

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
cd packages/mcp-server
npm install
```

### 2. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集してAPIのURLを設定
```

### 3. ビルドと起動
```bash
npm run build
npm run dev
```

### 4. Claude Desktopでの設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加：

```json
{
  "mcpServers": {
    "building-os": {
      "command": "node",
      "args": ["/path/to/bop-mcp-server/packages/mcp-server/dist/index.js"],
      "env": {
        "HOT_API_URL": "https://your-api-endpoint.com/v1"
      }
    }
  }
}
```

Claude Desktopを再起動後、以下のような質問でテストできます：
- "Building OSのデジタルツインのトポロジー情報を取得してください"
- "ポイントID ['uuid1', 'uuid2'] の最新データを取得してください"

## 📋 実装済み機能

### MCPツール

#### 1. search_digital_twin
デジタルツイン情報を検索・取得します。

**パラメータ:**
- `query_type`: 'topology' | 'children' | 'filter' | 'details'
- `depth`: 'Space' | 'Equipment' | 'Point' (optional)
- `point_id`: string | string[] (optional)
- `filters`: object (optional)

**使用例:**
```json
{
  "query_type": "topology",
  "depth": "Space"
}
```

#### 2. get_latest_data
指定したポイントの最新値を取得します。

**パラメータ:**
- `point_id`: string[] (required)

**使用例:**
```json
{
  "point_id": ["uuid-temp-001", "uuid-light-001"]
}
```

## 🔧 開発

### プロジェクト構造
```
packages/mcp-server/
├── src/
│   ├── index.ts         # MCPサーバーメイン
│   ├── client.ts        # Building OS APIクライアント
│   └── types.ts         # 型定義
├── dist/                # ビルド出力
├── .env                 # 環境変数
└── package.json
```

### 環境変数
- `HOT_API_URL`: Building OS Hot APIのエンドポイント
- `NODE_ENV`: 実行環境 (development/production)

### APIエンドポイント
現在はHot APIの以下のエンドポイントを使用：
- `POST /digital-twin/search` - デジタルツイン検索
- `POST /point-data/latest` - 最新データ取得

## 🧪 テスト

### 直接テスト
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

### Claude Desktopでのテスト
1. 上記の設定を完了
2. Claude Desktopを再起動
3. Building OS関連の質問を投げる

## 📚 今後の実装予定

- 認証ツール (login, refresh_token)
- 機器制御ツール (send_command)
- スケジュール管理ツール
- プリセット管理ツール
- データ抽出ツール
- リアルタイム通信ツール

## 🔗 関連リンク

- [MCP Protocol](https://modelcontextprotocol.io/)
- [Building OS API仕様](../../../openapi/)
- [プロジェクト要件書](../../../README.md)