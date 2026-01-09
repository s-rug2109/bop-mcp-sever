# Building OS MCP Server

## セットアップ

```bash
cd packages/mcp-server
npm install
```

## 環境変数設定

```bash
cp .env.example .env
# .envファイルを編集してAPIのURLとトークンを設定
```

## 開発実行

```bash
npm run dev
```

## ビルド

```bash
npm run build
npm start
```

## 実装済み機能

### 1. search_digital_twin
デジタルツイン情報を検索・取得

**パラメータ:**
- `query_type`: 'topology' | 'children' | 'filter' | 'details'
- `depth`: 'Space' | 'Equipment' | 'Point' (optional)
- `point_id`: string | string[] (optional)
- `filters`: object (optional)

### 2. get_latest_data
指定したポイントの最新値を取得

**パラメータ:**
- `point_id`: string[] (required)

## テスト方法

MCPクライアント（Claude Desktop等）から以下のツールを呼び出してテスト:

```json
{
  "name": "search_digital_twin",
  "arguments": {
    "query_type": "topology",
    "depth": "Space"
  }
}
```

```json
{
  "name": "get_latest_data",
  "arguments": {
    "point_id": ["uuid-temp-001", "uuid-light-001"]
  }
}
```