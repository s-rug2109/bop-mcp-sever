# Building OS MCP Server 開発要件書

## 📋 プロジェクト概要

### プロジェクト名
Building OS MCP Server

### 目的
スマートビルディングの各種APIをMCPサーバー経由で提供し、AIエージェントがビル管理機能を利用できるようにする。
認証、IoT制御、データ抽出、リアルタイム通信の4つのAPIドメインを統合し、包括的なビル管理システムを構築する。

### アーキテクチャ方針
疎結合型 - 既存のBuilding OS APIをAPI Gateway経由で利用し、MCPサーバーは外部インターフェースとして機能する

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

## ✅ 現在の実装状況

### 実装済み（Phase 1完了）
- [x] プロジェクト初期化
- [x] OpenAPI仕様書作成
- [x] MCPサーバー骨格実装
- [x] APIクライアント基盤実装
- [x] 2つのコアツール実装
  - `search_digital_twin`: デジタルツイン情報検索
  - `get_latest_data`: ポイントデータ最新値取得
- [x] Claude Desktopとの連携テスト完了

### 今後の実装予定
- [ ] 認証ツール (login, refresh_token)
- [ ] 機器制御ツール (send_command)
- [ ] スケジュール管理ツール
- [ ] プリセット管理ツール
- [ ] データ抽出ツール
- [ ] リアルタイム通信ツール
- [ ] AWS CDKインフラ実装
- [ ] CI/CDパイプライン構築

---

## 🏗️ アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────┐
│              AI Agent Layer                     │
│         (Claude, GPT, etc.)                     │
└─────────────────┬───────────────────────────────┘
                  │ MCP Protocol
┌─────────────────▼───────────────────────────────┐
│            MCP Server                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │  Auth   │ │   Hot   │ │  Cold   │ │ Stream ││
│  │ Client  │ │ Client  │ │ Client  │ │ Client ││
│  └─────────┘ └─────────┘ └─────────┘ └────────┘│
└─────────────────┬───────────────────────────────┘
                  │ HTTPS/WebSocket
┌─────────────────▼───────────────────────────────┐
│           API Gateway Cluster                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │  Auth   │ │   Hot   │ │  Cold   │ │ Stream ││
│  │   API   │ │   API   │ │   API   │ │   API  ││
│  └─────────┘ └─────────┘ └─────────┘ └────────┘│
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Lambda Functions                   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐│
│ │ Auth │ │ IoT  │ │ Data │ │ Cold │ │WebSocket││
│ │      │ │Control│ │Query │ │Extract│ │Handler ││
│ └──────┘ └──────┘ └──────┘ └──────┘ └────────┘│
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Backend Services & Data Layer           │
│  Cognito | DynamoDB | S3 | Athena | Timestream │
└─────────────────────────────────────────────────┘
```

### 技術スタック

| カテゴリ     | 技術                                                   | バージョン | 用途                     |
| ------------ | ------------------------------------------------------ | ---------- | ------------------------ |
| Runtime      | Node.js                                                | 20.x       | MCPサーバー実行環境      |
| 言語         | TypeScript                                             | 5.x        | 型安全な開発             |
| Framework    | @modelcontextprotocol/sdk                              | latest     | MCPサーバー実装          |
| HTTP Client  | axios                                                  | latest     | API通信                  |
| WebSocket    | ws                                                     | latest     | リアルタイム通信         |
| IaC          | AWS CDK                                                | 2.x        | インフラストラクチャ定義 |
| Testing      | Vitest                                                 | latest     | ユニット・統合テスト     |
| Linting      | ESLint + Prettier                                      | latest     | コード品質管理           |
| AWS Services | API Gateway, Lambda, Cognito, S3, DynamoDB, Athena    | -          | バックエンド基盤         |

### 設計原則

1. **API First**: OpenAPI 3.0仕様に基づく設計
2. **Domain Separation**: Auth/Hot/Cold/Streamの4ドメイン分離
3. **Multi-Stakeholder Support**: テナント、オーナー、BM、PM等の多様なステークホルダーに対応
4. **Stateless**: MCPサーバーはステートレスに保ち、スケーラビリティを確保
5. **Security by Default**: 認証・認可をAPI Gateway層で実施
6. **Real-time Ready**: WebSocketによるリアルタイム通信対応

---

## 📁 プロジェクト構造

```
building-os-mcp/
├── packages/
│   ├── mcp-server/              # MCPサーバー本体
│   │   ├── src/
│   │   │   ├── index.ts         # エントリーポイント
│   │   │   ├── server.ts        # MCPサーバークラス
│   │   │   ├── tools/           # MCPツール定義
│   │   │   │   ├── index.ts
│   │   │   │   ├── building.ts  # ビル管理ツール
│   │   │   │   ├── space.ts     # スペース管理ツール
│   │   │   │   ├── energy.ts    # エネルギー管理ツール
│   │   │   │   ├── agent.ts     # エージェント協調ツール
│   │   │   ├── resources/       # MCPリソース定義
│   │   │   │   ├── index.ts
│   │   │   │   ├── building.ts
│   │   │   │   ├── spaces.ts
│   │   │   ├── api/             # Building OS APIクライアント
│   │   │   │   ├── client.ts    # HTTPクライアント
│   │   │   │   ├── types.ts     # APIレスポンス型定義
│   │   │   │   ├── errors.ts    # カスタムエラー定義
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts    # ロギングユーティリティ
│   │   │   │   ├── retry.ts     # リトライロジック
│   │   │   │   ├── validator.ts # バリデーション
│   │   │   ├── config/
│   │   │   │   ├── env.ts       # 環境変数管理
│   │   │   ├── __tests__/
│   │   │   │   ├── server.test.ts
│   │   │   │   ├── tools/
│   │   │   │   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │
│   ├── cdk-infrastructure/      # AWS CDKによるインフラ定義
│   │   ├── bin/
│   │   │   ├── app.ts           # CDKアプリケーション
│   │   ├── lib/
│   │   │   ├── api-stack.ts     # API Gateway等
│   │   │   ├── mcp-stack.ts     # MCPサーバー Lambda
│   │   │   ├── storage-stack.ts # S3, DynamoDB
│   │   │   ├── auth-stack.ts    # Cognito
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── cdk.json
│   │
│   ├── shared/                  # 共通型定義・ユーティリティ
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── building.ts
│   │   │   │   ├── space.ts
│   │   │   │   ├── agent.ts
│   │   │   │   ├── common.ts
│   │   │   ├── constants/
│   │   │   │   ├── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │
├── docs/
│   ├── architecture.md          # アーキテクチャドキュメント
│   ├── api-spec.yaml           # OpenAPI仕様書
│   ├── deployment.md           # デプロイ手順
│   ├── development.md          # 開発ガイド
│   ├── agent-collaboration.md  # A2A通信仕様
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # CI/CDパイプライン
│   │   ├── deploy.yml
│
├── .env.example                 # 環境変数テンプレート
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json                 # Workspace root
├── pnpm-workspace.yaml         # pnpm workspace設定
├── README.md
└── LICENSE
```

---

## 🔌 API仕様（OpenAPI 3.0）

### APIドメイン構成

システムは4つの独立したAPIドメインで構成されています：

#### 1. Auth API (認証)
- **目的**: Cognitoベースのユーザー認証
- **エンドポイント**:
  - `POST /auth/login` - ユーザーログイン
  - `POST /auth/refresh` - トークン更新
- **特徴**: 認証不要、JWTトークン発行

#### 2. Hot API (IoT制御)
- **目的**: リアルタイムIoTデバイス制御とデータ取得
- **主要エンドポイント**:
  - `POST /digital-twin/search` - デジタルツイン情報検索
  - `POST /point-data/latest` - 最新値取得
  - `POST /point-data/history` - 履歴データ取得
  - `POST /command` - 機器制御コマンド送信
  - `GET/POST/DELETE /schedule` - スケジュール管理
  - `GET/POST/DELETE /presets` - プリセット管理
- **特徴**: Cognito認証必須、高頻度アクセス

#### 3. Cold API (データ抽出)
- **目的**: Athenaを使用した大規模データ抽出
- **エンドポイント**:
  - `GET /cold-task` - タスク一覧・詳細取得
  - `POST /cold-task` - 新規データ抽出タスク作成
  - `PUT /cold-task` - スケジュール有効化・無効化
  - `DELETE /cold-task` - タスク削除
- **特徴**: 非同期処理、Webhook通知、署名付きURL発行

#### 4. Stream API (WebSocket)
- **目的**: リアルタイムデータ配信
- **アクション**:
  - `subscribe_points` - ポイント購読
  - `unsubscribe_points` - ポイント購読解除
  - `unsubscribe_subscription` - グループ一括解除
  - `get_subscription_list` - 購読リスト確認
- **特徴**: イベントドリブン、リアルタイムプッシュ通知

---

## 🛠️ MCP実装仕様

### MCPツール定義

#### 1. 認証関連ツール

##### login
```typescript
{
  name: "login",
  description: "ユーザー認証を実行し、アクセストークンを取得します",
  inputSchema: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: {
        type: "string",
        description: "ユーザー名またはメールアドレス"
      },
      password: {
        type: "string",
        description: "パスワード"
      }
    }
  }
}
```

##### refresh_token
```typescript
{
  name: "refresh_token",
  description: "リフレッシュトークンを使用してアクセストークンを更新します",
  inputSchema: {
    type: "object",
    required: ["refresh_token"],
    properties: {
      refresh_token: {
        type: "string",
        description: "リフレッシュトークン"
      }
    }
  }
}
```

#### 2. デジタルツイン関連ツール

##### search_digital_twin
```typescript
{
  name: "search_digital_twin",
  description: "デジタルツイン情報を検索・取得します",
  inputSchema: {
    type: "object",
    required: ["query_type"],
    properties: {
      query_type: {
        type: "string",
        enum: ["topology", "children", "filter", "details"],
        description: "検索タイプ"
      },
      depth: {
        type: "string",
        enum: ["Space", "Equipment", "Point"],
        description: "topology時の取得階層深さ"
      },
      point_id: {
        type: "array",
        items: { type: "string" },
        description: "対象のUUIDリスト"
      },
      filters: {
        type: "object",
        description: "フィルタ条件"
      }
    }
  }
}
```

#### 3. ポイントデータ関連ツール

##### get_latest_data
```typescript
{
  name: "get_latest_data",
  description: "指定したポイントの最新値を取得します",
  inputSchema: {
    type: "object",
    required: ["point_id"],
    properties: {
      point_id: {
        type: "array",
        items: { type: "string" },
        description: "取得対象のUUIDリスト"
      }
    }
  }
}
```

##### get_history_data
```typescript
{
  name: "get_history_data",
  description: "指定したポイントの履歴データを取得します",
  inputSchema: {
    type: "object",
    required: ["point_id"],
    properties: {
      point_id: {
        type: "array",
        items: { type: "string" },
        description: "取得対象のUUIDリスト"
      },
      start_time: {
        type: "string",
        format: "date-time",
        description: "開始日時"
      },
      end_time: {
        type: "string",
        format: "date-time",
        description: "終了日時"
      },
      scan_forward: {
        type: "boolean",
        description: "true=古い順, false=新しい順"
      }
    }
  }
}
```

#### 4. 機器制御関連ツール

##### send_command
```typescript
{
  name: "send_command",
  description: "IoT機器に制御コマンドを送信します",
  inputSchema: {
    type: "object",
    required: ["commands"],
    properties: {
      commands: {
        type: "array",
        items: {
          type: "object",
          required: ["point_id", "value"],
          properties: {
            point_id: {
              type: "string",
              description: "制御対象のUUID"
            },
            value: {
              type: "number",
              description: "設定値"
            }
          }
        }
      }
    }
  }
}
```

#### 5. スケジュール関連ツール

##### list_schedules
```typescript
{
  name: "list_schedules",
  description: "登録済みスケジュール一覧を取得します",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

##### create_schedule
```typescript
{
  name: "create_schedule",
  description: "新しいスケジュールを作成します",
  inputSchema: {
    type: "object",
    required: ["type", "point_id", "value"],
    properties: {
      type: {
        type: "string",
        enum: ["ONE_TIME", "RECURRING"],
        description: "スケジュールタイプ"
      },
      point_id: {
        type: "string",
        description: "対象ポイントUUID"
      },
      value: {
        type: "number",
        description: "実行時の設定値"
      },
      at_time: {
        type: "string",
        description: "ONE_TIMEの場合の実行日時"
      },
      cron_expression: {
        type: "string",
        description: "RECURRINGの場合のCRON式"
      }
    }
  }
}
```

#### 6. プリセット関連ツール

##### list_presets
```typescript
{
  name: "list_presets",
  description: "登録済みプリセット一覧を取得します",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

##### create_preset
```typescript
{
  name: "create_preset",
  description: "新しいプリセットを作成します",
  inputSchema: {
    type: "object",
    required: ["name", "commands"],
    properties: {
      name: {
        type: "string",
        description: "プリセット名"
      },
      commands: {
        type: "array",
        items: {
          type: "object",
          required: ["point_id", "value"],
          properties: {
            point_id: { type: "string" },
            value: { type: "number" }
          }
        }
      }
    }
  }
}
```

##### execute_preset
```typescript
{
  name: "execute_preset",
  description: "指定したプリセットを実行します",
  inputSchema: {
    type: "object",
    required: ["preset_ids"],
    properties: {
      preset_ids: {
        type: "array",
        items: { type: "string" },
        description: "実行するプリセットIDリスト"
      }
    }
  }
}
```

#### 7. データ抽出関連ツール

##### list_extraction_tasks
```typescript
{
  name: "list_extraction_tasks",
  description: "データ抽出タスク一覧を取得します",
  inputSchema: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "特定タスクのID（省略時は全タスク）"
      }
    }
  }
}
```

##### create_extraction_task
```typescript
{
  name: "create_extraction_task",
  description: "新しいデータ抽出タスクを作成します",
  inputSchema: {
    type: "object",
    required: ["startDate", "endDate", "execType"],
    properties: {
      startDate: {
        type: "string",
        format: "date-time",
        description: "抽出対象データの開始日時"
      },
      endDate: {
        type: "string",
        format: "date-time",
        description: "抽出対象データの終了日時"
      },
      execType: {
        type: "integer",
        enum: [1, 2, 3],
        description: "1=即時, 2=日時指定, 3=定期"
      },
      fileType: {
        type: "string",
        enum: ["CSV", "JSON", "PARQUET"],
        description: "出力ファイル形式"
      },
      webhookUrl: {
        type: "string",
        description: "完了通知先URL"
      },
      pointFilter: {
        type: "object",
        description: "抽出対象絞り込み条件"
      }
    }
  }
}
```

#### 8. リアルタイム通信関連ツール

##### subscribe_realtime_data
```typescript
{
  name: "subscribe_realtime_data",
  description: "指定したポイントのリアルタイムデータを購読します",
  inputSchema: {
    type: "object",
    required: ["point_id"],
    properties: {
      point_id: {
        type: "array",
        items: { type: "string" },
        description: "購読対象のUUIDリスト"
      },
      subscription_id: {
        type: "string",
        description: "購読グループID"
      }
    }
  }
}
```

##### unsubscribe_realtime_data
```typescript
{
  name: "unsubscribe_realtime_data",
  description: "リアルタイムデータの購読を解除します",
  inputSchema: {
    type: "object",
    properties: {
      point_id: {
        type: "array",
        items: { type: "string" },
        description: "解除対象のUUIDリスト（省略時は全解除）"
      },
      subscription_id: {
        type: "string",
        description: "解除対象のグループID"
      }
    }
  }
}
```

### MCPリソース定義

#### 1. building:///info
```typescript
{
  uri: "building://{buildingId}/info",
  name: "ビル基本情報",
  description: "ビルの基本情報（名称、住所、設備仕様等）",
  mimeType: "application/json"
}
```

#### 2. building:///digital-twin
```typescript
{
  uri: "building://{buildingId}/digital-twin",
  name: "デジタルツイン情報",
  description: "ビルのデジタルツイン構造情報",
  mimeType: "application/json"
}
```

#### 3. building:///realtime
```typescript
{
  uri: "building://{buildingId}/realtime",
  name: "リアルタイムデータ",
  description: "ビルのリアルタイム状態情報",
  mimeType: "application/json"
}
```

#### 4. building:///schedules
```typescript
{
  uri: "building://{buildingId}/schedules",
  name: "スケジュール一覧",
  description: "登録済みスケジュール情報",
  mimeType: "application/json"
}
```

#### 5. building:///presets
```typescript
{
  uri: "building://{buildingId}/presets",
  name: "プリセット一覧",
  description: "登録済みプリセット情報",
  mimeType: "application/json"
}
```

---

## 🔐 セキュリティ要件

### 認証・認可

1. **API Gateway レベル**

   - AWS Cognito JWTトークン認証
   - カスタムオーソライザーでロールベースアクセス制御
   - APIキーによるレート制限
2. **MCPサーバーレベル**

   - 環境変数からAPIキーを読み込み
   - トークンの有効期限チェック
   - リクエスト署名検証（将来実装）
### ステークホルダー別権限

```typescript
enum Role {
  TENANT = 'tenant',           // テナント：自社スペースのみ
  VISITOR = 'visitor',         // 来訪者：公共エリアのみ
  OWNER = 'owner',             // オーナー：全データ参照可
  BM = 'building_manager',     // BM：運用管理全般
  PM = 'property_manager',     // PM：契約・財務データ
  ADMIN = 'admin'              // 管理者：全機能アクセス可
}

// 機能別アクセス権限
const PERMISSIONS = {
  // 認証関連
  AUTH: ['ADMIN', 'BM', 'PM', 'OWNER', 'TENANT', 'VISITOR'],
  
  // デジタルツイン情報
  DIGITAL_TWIN_READ: ['ADMIN', 'BM', 'PM', 'OWNER', 'TENANT'],
  DIGITAL_TWIN_WRITE: ['ADMIN', 'BM'],
  
  // ポイントデータ
  POINT_DATA_READ: ['ADMIN', 'BM', 'PM', 'OWNER', 'TENANT'],
  
  // 機器制御
  DEVICE_CONTROL: ['ADMIN', 'BM', 'TENANT'],
  
  // スケジュール管理
  SCHEDULE_READ: ['ADMIN', 'BM', 'PM', 'OWNER', 'TENANT'],
  SCHEDULE_WRITE: ['ADMIN', 'BM', 'TENANT'],
  
  // プリセット管理
  PRESET_READ: ['ADMIN', 'BM', 'PM', 'OWNER', 'TENANT'],
  PRESET_WRITE: ['ADMIN', 'BM', 'TENANT'],
  
  // データ抽出
  DATA_EXTRACTION: ['ADMIN', 'BM', 'PM', 'OWNER'],
  
  // リアルタイムデータ
  REALTIME_SUBSCRIBE: ['ADMIN', 'BM', 'PM', 'OWNER', 'TENANT']
};
```

### データ保護

- API通信はすべてHTTPS/TLS 1.3以上
- 個人情報（PII）はマスキング
- ログには機密情報を含めない
- AWS Secrets Managerで認証情報管理

---

## 📊 非機能要件

### パフォーマンス

| 項目                         | 目標値      | 測定方法           |
| ---------------------------- | ----------- | ------------------ |
| API応答時間 (Hot)           | p95 < 500ms | CloudWatch Metrics |
| API応答時間 (Cold)          | p95 < 30s   | CloudWatch Metrics |
| MCP Tool実行時間             | p95 < 2s    | カスタムメトリクス |
| WebSocketメッセージレイテンシ | p95 < 100ms | X-Ray トレーシング |
| 同時リクエスト処理           | 1000 req/s  | Load Testing       |

### 可用性

- SLA: 99.9%（月間ダウンタイム < 43分）
- Multi-AZ構成
- Auto Scaling設定
- ヘルスチェック実装

### スケーラビリティ

- MCPサーバー: ステートレス設計で水平スケール対応
- Lambda同時実行数: 初期1000、最大5000
- DynamoDB: On-Demand Capacity
- API Gateway: レート制限 10,000 req/s
- WebSocket: 同時接続数 10,000

### 監視・ロギング

```typescript
// ログレベル定義
enum LogLevel {
  ERROR = 'error',    // エラー発生時
  WARN = 'warn',      // 警告（リトライ等）
  INFO = 'info',      // 重要なイベント
  DEBUG = 'debug'     // デバッグ情報
}

// ログ構造
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  domain: 'auth' | 'hot' | 'cold' | 'stream';
  requestId: string;
  userId?: string;
  message: string;
  context?: object;
  error?: Error;
  duration?: number;
}

// メトリクス定義
interface Metrics {
  // APIメトリクス
  api_requests_total: number;
  api_request_duration_ms: number;
  api_errors_total: number;
  
  // MCPメトリクス
  mcp_tool_executions_total: number;
  mcp_tool_duration_ms: number;
  mcp_tool_errors_total: number;
  
  // WebSocketメトリクス
  websocket_connections_active: number;
  websocket_messages_sent: number;
  websocket_messages_received: number;
  
  // ビジネスメトリクス
  device_commands_sent: number;
  data_extraction_tasks_created: number;
  realtime_subscriptions_active: number;
}
```

- CloudWatch Logs で集約
- CloudWatch Alarms でアラート
- X-Ray で分散トレーシング
- カスタムメトリクスでビジネスKPI追跡

---

## 🧪 テスト要件

### ユニットテスト

- **カバレッジ目標**: 80%以上
- **テストフレームワーク**: Vitest
- **対象**:
  - 各ツールの実行ロジック
  - APIクライアントのエラーハンドリング
  - バリデーション関数
  - ユーティリティ関数

### 統合テスト

- Building OS API のモック使用
- E2E MCP通信フロー
- エージェント間協調シナリオ

### テストデータ

```typescript
// テスト用認証データ
export const mockAuthData = {
  username: 'test-user@example.com',
  password: 'TestPassword123!',
  tokens: {
    access_token: 'mock-access-token',
    id_token: 'mock-id-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600
  }
};

// テスト用デジタルツインデータ
export const mockDigitalTwinData = {
  topology: {
    building: {
      id: 'building-001',
      name: 'Test Building A',
      floors: [
        {
          id: 'floor-001',
          name: '1F',
          spaces: [
            {
              id: 'space-001',
              name: 'Meeting Room A',
              type: 'meeting_room'
            }
          ]
        }
      ]
    }
  }
};

// テスト用ポイントデータ
export const mockPointData = {
  latest: [
    {
      point_id: 'uuid-temp-001',
      value: 24.5,
      timestamp: '2024-01-15T10:30:00Z',
      quality: 'GOOD'
    }
  ],
  history: [
    {
      point_id: 'uuid-temp-001',
      values: [
        { timestamp: '2024-01-15T10:00:00Z', value: 24.0 },
        { timestamp: '2024-01-15T10:30:00Z', value: 24.5 }
      ]
    }
  ]
};

// テスト用コマンドデータ
export const mockCommandData = {
  commands: [
    {
      point_id: 'uuid-ac-001',
      value: 26
    },
    {
      point_id: 'uuid-light-001',
      value: 1
    }
  ]
};

// テスト用スケジュールデータ
export const mockScheduleData = {
  schedules: [
    {
      schedule_id: 'sched-001',
      type: 'RECURRING',
      point_id: 'uuid-ac-001',
      value: 26,
      cron_expression: 'cron(0 9 * * ? *)',
      status: 'ACTIVE'
    }
  ]
};

// テスト用プリセットデータ
export const mockPresetData = {
  presets: [
    {
      preset_id: 'preset-001',
      name: 'Morning Mode',
      commands: [
        { point_id: 'uuid-light-001', value: 1 },
        { point_id: 'uuid-ac-001', value: 26 }
      ]
    }
  ]
};

// テスト用データ抽出タスクデータ
export const mockExtractionTaskData = {
  tasks: [
    {
      taskId: 'task-001',
      status: 'COMPLETED',
      execType: 1,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-02T00:00:00Z',
      fileType: 'CSV',
      outputUrl: 's3://test-bucket/task-001/',
      downloadUrls: [
        {
          fileName: 'results.csv',
          downloadUrl: 'https://s3.amazonaws.com/signed-url'
        }
      ]
    }
  ]
};
```

---

## 🚀 デプロイメント要件

### 環境構成

| 環境        | 用途       | AWS Account     | 特徴                   |
| ----------- | ---------- | --------------- | ---------------------- |
| Development | 開発・検証 | dev-account     | ローカルでも動作       |
| Staging     | 統合テスト | staging-account | Production相当の構成   |
| Production  | 本番運用   | prod-account    | Multi-AZ, Auto Scaling |

### CI/CDパイプライン

```yaml
# .github/workflows/ci.yml の構成

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm type-check
      
      - name: Test
        run: pnpm test
      
      - name: Coverage
        run: pnpm coverage
  
  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Package Lambda
        run: pnpm package
  
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          aws configure set region ${{ vars.AWS_REGION }}
          pnpm cdk deploy --all --require-approval never
  
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          aws configure set region ${{ vars.AWS_REGION }}
          pnpm cdk deploy --all --require-approval never
```

### デプロイ戦略

- **Blue/Green Deployment**: Lambda Aliasを使用
- **カナリアリリース**: 10% → 50% → 100%
- **ロールバック**: 5分以内に前バージョンに戻せること
- **スモークテスト**: デプロイ後の基本動作確認

---

## 📝 環境変数

```bash
# .env.example

# API Configuration
AUTH_API_URL=https://auth-api.building-os.example.com
HOT_API_URL=https://hot-api.building-os.example.com
COLD_API_URL=https://cold-api.building-os.example.com
STREAM_API_URL=wss://stream-api.building-os.example.com

# AWS Configuration
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012

# Authentication
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=your-client-secret-here

# MCP Server Configuration
MCP_SERVER_NAME=building-os-mcp-server
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_PORT=3000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DESTINATION=console

# Performance
API_TIMEOUT_MS=30000
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=1000
CONCURRENCY_LIMIT=10

# WebSocket Configuration
WEBSOCKET_RECONNECT_INTERVAL=5000
WEBSOCKET_MAX_RECONNECT_ATTEMPTS=5
WEBSOCKET_PING_INTERVAL=30000

# Feature Flags
ENABLE_AUTH_CACHING=true
ENABLE_METRICS_COLLECTION=true
ENABLE_DISTRIBUTED_TRACING=true
ENABLE_RATE_LIMITING=true

# Development
DEVELOPMENT_MODE=false
MOCK_API_RESPONSES=false
ENABLE_DEBUG_LOGGING=false
```

---

## 📚 開発ガイドライン

### コーディング規約

```typescript
// ファイル命名規則
// - ケバブケース: my-component.ts
// - テストファイル: my-component.test.ts
// - 型定義ファイル: my-types.ts

// 関数命名規則
// - 動詞から始める: getUserData, createBooking
// - async関数の明示: async function fetchBuildingStatus()

// 型定義の徹底
// - any 型の禁止
// - unknown 型の活用
// - 厳格な null チェック

// エラーハンドリング
class BuildingOSError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BuildingOSError';
  }
}

// ログ出力
logger.info('Building status retrieved', {
  buildingId,
  occupancy: status.occupancy.percentage,
  duration: Date.now() - startTime
});
```

### コミットメッセージ規約

```
# Conventional Commits に準拠

feat: 新機能追加
fix: バグ修正
docs: ドキュメント変更
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・補助ツール変更

例：
feat(mcp): add request_collaboration tool
fix(api): handle timeout errors properly
docs(readme): update deployment instructions
```

---

## 🎯 マイルストーン

### Phase 1: 基盤構築（4週間）

- [X] プロジェクト初期化
- [X] OpenAPI仕様書作成
- [ ] MCPサーバー骨格実装
- [ ] APIクライアント基盤実装
- [ ] ユニットテスト環境構築

### Phase 2: 認証・コア機能実装（6週間）

- [ ] 認証ツール実装 (login, refresh_token)
- [ ] デジタルツインツール実装 (search_digital_twin)
- [ ] ポイントデータツール実装 (get_latest_data, get_history_data)
- [ ] 機器制御ツール実装 (send_command)
- [ ] 統合テスト

### Phase 3: 高度機能実装（4週間）

- [ ] スケジュール管理ツール実装
- [ ] プリセット管理ツール実装
- [ ] データ抽出ツール実装
- [ ] リアルタイム通信ツール実装
- [ ] WebSocket接続管理

### Phase 4: インフラ・デプロイ（3週間）

- [ ] AWS CDK スタック実装
- [ ] CI/CDパイプライン構築
- [ ] Staging環境デプロイ
- [ ] 負荷テスト
- [ ] セキュリティテスト

### Phase 5: 本番リリース（2週間）

- [ ] Production環境デプロイ
- [ ] 監視・アラート設定
- [ ] ドキュメント整備
- [ ] 運用手順書作成
- [ ] ユーザートレーニング

---

## 🔄 今後の拡張計画

### Short-term (3-6ヶ月)

- **エラーハンドリング強化**: リトライ機構、サーキットブレーカー実装
- **パフォーマンス最適化**: キャッシュ機構、コネクションプーリング
- **セキュリティ強化**: リクエスト署名検証、レート制限
- **モニタリング強化**: カスタムメトリクス、アラートルール

### Mid-term (6-12ヶ月)

- **機械学習連携**: 異常検知、予測メンテナンス
- **マルチテナント対応**: テナント別データ分離、権限管理
- **グラフィカルUI**: ダッシュボード、設定画面
- **モバイルアプリ**: スマートフォンアプリ連携
- **外部サービス連携**: 天気API、交通情報、カレンダー

### Long-term (12ヶ月以降)

- **マルチリージョン展開**: グローバルスケール対応
- **エッジコンピューティング**: ローカル処理、オフライン対応
- **デジタルツイン高度化**: 3Dモデル、VR/AR連携
- **サードパーティーエコシステム**: プラグインアーキテクチャ
- **カーボンニュートラル管理**: CO2排出量追跡、最適化

---

## 📞 サポート・連絡先

### 開発チーム

- Tech Lead: [名前]
- Backend Engineer: [名前]
- DevOps Engineer: [名前]

### ドキュメント

- Architecture: `docs/architecture.md`
- API Spec: `docs/api-spec.yaml`
- Deployment: `docs/deployment.md`

### リポジトリ

- GitHub: [リポジトリURL]
- Issue Tracking: [IssueトラッカーURL]

---

## 📄 ライセンス

[ライセンス種別を記載]

---

**Document Version**: 1.0.0
**Last Updated**: 2024-01-15
**Status**: Draft
