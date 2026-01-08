# Building OS MCP Server 開発要件書

## 📋 プロジェクト概要

### プロジェクト名

Building OS MCP Server

### 目的

ビルOSの各種APIをMCPサーバー経由で提供し、AIエージェントがビル管理機能を利用できるようにする。
将来的にはAgent-to-Agent (A2A)通信により、複数のビルエージェントが協調して都市機能を向上させる。

### アーキテクチャ方針

疎結合型 - Building OS APIをAPI Gateway経由で利用し、MCPサーバーは外部インターフェースとして機能する

---

## 🏗️ アーキテクチャ設計

### システム構成図

```
┌────────────────────────────────────────────────┐
│         Urban Agent Orchestration Layer       │
│    (複数ビルエージェント間の協調制御)          │
└────────────────┬───────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│Building│  │Building│  │Building│
│Agent A │  │Agent B │  │Agent C │
│(MCP)   │  │(MCP)   │  │(MCP)   │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │           │
┌───▼───────────▼───────────▼──────┐
│    Building OS API Gateway       │
│  - Authentication (Cognito)      │
│  - Rate Limiting                 │
│  - API Versioning                │
│  - Request Routing               │
└───┬──────────────────────────────┘
    │
┌───▼──────────────────────────────┐
│   Microservices Layer            │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │Space │ │Energy│ │Access│    │
│  │ API  │ │ API  │ │ API  │    │
│  └──┬───┘ └──┬───┘ └──┬───┘    │
└─────┼────────┼────────┼─────────┘
      │        │        │
┌─────▼────────▼────────▼─────────┐
│     AWS Backend Services         │
│  S3 / DynamoDB / Lambda / etc.  │
└──────────────────────────────────┘
```

### 技術スタック

| カテゴリ     | 技術                                                   | バージョン | 用途                     |
| ------------ | ------------------------------------------------------ | ---------- | ------------------------ |
| Runtime      | Node.js                                                | 20.x       | MCPサーバー実行環境      |
| 言語         | TypeScript                                             | 5.x        | 型安全な開発             |
| Framework    | @modelcontextprotocol/sdk                              | latest     | MCPサーバー実装          |
| IaC          | AWS CDK                                                | 2.x        | インフラストラクチャ定義 |
| Testing      | Vitest                                                 | latest     | ユニット・統合テスト     |
| Linting      | ESLint + Prettier                                      | latest     | コード品質管理           |
| AWS Services | API Gateway, Lambda, Cognito, S3, DynamoDB, CloudWatch | -          | バックエンド基盤         |

### 設計原則

1. **API First**: OpenAPI 3.0仕様に基づく設計
2. **Agent-to-Agent (A2A) Ready**: エージェント間協調を前提とした設計
3. **Multi-Stakeholder Support**: テナント、オーナー、BM、PM等の多様なステークホルダーに対応
4. **Stateless**: MCPサーバーはステートレスに保ち、スケーラビリティを確保
5. **Security by Default**: 認証・認可をAPI Gateway層で実施
6. **Observability**: ログ、メトリクス、トレーシングを標準実装

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

### Building OS API エンドポイント

```yaml
openapi: 3.0.0
info:
  title: Building OS API
  version: 1.0.0
  description: ビルOS API - MCPサーバーから利用
  contact:
    name: Building OS Team

servers:
  - url: https://api.building-os.example.com/v1
    description: Production
  - url: https://api-staging.building-os.example.com/v1
    description: Staging

security:
  - BearerAuth: []

paths:
  /buildings/{buildingId}/status:
    get:
      summary: ビルの現在状態を取得
      description: 占有率、エネルギー使用量、各種システムの稼働状況を返す
      tags: [Building Management]
      parameters:
        - name: buildingId
          in: path
          required: true
          schema:
            type: string
          description: ビルID（例：building-001）
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BuildingStatus'
              example:
                buildingId: "building-001"
                timestamp: "2024-01-15T10:30:00Z"
                occupancy:
                  current: 450
                  capacity: 600
                  percentage: 75
                energyUsage:
                  current: 320
                  daily: 5400
                  trend: "stable"
                systems:
                  hvac: "normal"
                  lighting: "normal"
                  security: "normal"
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /buildings/{buildingId}/spaces:
    get:
      summary: スペース一覧を取得
      tags: [Space Management]
      parameters:
        - name: buildingId
          in: path
          required: true
          schema:
            type: string
        - name: floor
          in: query
          schema:
            type: integer
          description: フロア番号でフィルタ
        - name: type
          in: query
          schema:
            type: string
            enum: [meeting_room, workspace, common_area]
          description: スペースタイプでフィルタ
        - name: available
          in: query
          schema:
            type: boolean
          description: 利用可能なスペースのみ
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  spaces:
                    type: array
                    items:
                      $ref: '#/components/schemas/Space'
                  total:
                    type: integer

  /buildings/{buildingId}/spaces/{spaceId}/bookings:
    post:
      summary: スペースを予約
      tags: [Space Management]
      parameters:
        - name: buildingId
          in: path
          required: true
          schema:
            type: string
        - name: spaceId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookingRequest'
      responses:
        '201':
          description: 予約成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
        '409':
          description: 予約競合

  /buildings/{buildingId}/energy:
    get:
      summary: エネルギー使用状況を取得
      tags: [Energy Management]
      parameters:
        - name: buildingId
          in: path
          required: true
          schema:
            type: string
        - name: period
          in: query
          schema:
            type: string
            enum: [hourly, daily, weekly, monthly]
            default: daily
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EnergyData'

  /agent/collaborate:
    post:
      summary: エージェント間協調リクエスト
      description: 他のビルエージェントに協力を要請
      tags: [Agent Collaboration]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CollaborationRequest'
      responses:
        '202':
          description: リクエスト受付
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CollaborationResponse'

  /agent/capabilities:
    get:
      summary: エージェントの能力を取得
      description: このビルエージェントが提供できる機能一覧
      tags: [Agent Collaboration]
      parameters:
        - name: buildingId
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentCapabilities'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Cognito発行のJWTトークン

  schemas:
    BuildingStatus:
      type: object
      required:
        - buildingId
        - timestamp
      properties:
        buildingId:
          type: string
          description: ビルID
        timestamp:
          type: string
          format: date-time
          description: データ取得時刻
        occupancy:
          type: object
          properties:
            current:
              type: integer
              description: 現在の在館人数
            capacity:
              type: integer
              description: 最大収容人数
            percentage:
              type: number
              format: float
              description: 占有率（%）
        energyUsage:
          type: object
          properties:
            current:
              type: number
              format: float
              description: 現在の使用電力（kW）
            daily:
              type: number
              format: float
              description: 本日の累積使用量（kWh）
            trend:
              type: string
              enum: [up, down, stable]
              description: トレンド
        systems:
          type: object
          properties:
            hvac:
              type: string
              enum: [normal, warning, error]
            lighting:
              type: string
              enum: [normal, warning, error]
            security:
              type: string
              enum: [normal, warning, error]

    Space:
      type: object
      required:
        - spaceId
        - buildingId
        - name
        - type
      properties:
        spaceId:
          type: string
        buildingId:
          type: string
        floor:
          type: integer
        name:
          type: string
        type:
          type: string
          enum: [meeting_room, workspace, common_area, private_office]
        capacity:
          type: integer
        available:
          type: boolean
        amenities:
          type: array
          items:
            type: string
          example: ["projector", "whiteboard", "video_conference"]
        currentBooking:
          $ref: '#/components/schemas/Booking'

    BookingRequest:
      type: object
      required:
        - userId
        - startTime
        - endTime
      properties:
        userId:
          type: string
        startTime:
          type: string
          format: date-time
        endTime:
          type: string
          format: date-time
        purpose:
          type: string
        attendees:
          type: integer

    Booking:
      type: object
      properties:
        bookingId:
          type: string
        spaceId:
          type: string
        userId:
          type: string
        startTime:
          type: string
          format: date-time
        endTime:
          type: string
          format: date-time
        status:
          type: string
          enum: [confirmed, pending, cancelled]
        createdAt:
          type: string
          format: date-time

    EnergyData:
      type: object
      properties:
        buildingId:
          type: string
        period:
          type: string
        data:
          type: array
          items:
            type: object
            properties:
              timestamp:
                type: string
                format: date-time
              consumption:
                type: number
                format: float
              cost:
                type: number
                format: float

    CollaborationRequest:
      type: object
      required:
        - sourceBuildingId
        - targetBuildingId
        - task
      properties:
        sourceBuildingId:
          type: string
          description: 要請元のビルID
        targetBuildingId:
          type: string
          description: 要請先のビルID
        task:
          type: string
          description: 協調タスク名
          example: "prepare_for_large_event"
        params:
          type: object
          description: タスク固有のパラメータ
          additionalProperties: true
        priority:
          type: string
          enum: [low, medium, high, urgent]
          default: medium
        deadline:
          type: string
          format: date-time

    CollaborationResponse:
      type: object
      properties:
        requestId:
          type: string
        status:
          type: string
          enum: [accepted, rejected, processing]
        estimatedCompletionTime:
          type: string
          format: date-time
        message:
          type: string

    AgentCapabilities:
      type: object
      properties:
        buildingId:
          type: string
        capabilities:
          type: array
          items:
            type: string
          example: 
            - "space_management"
            - "energy_optimization"
            - "visitor_management"
            - "emergency_coordination"
        version:
          type: string
        lastUpdated:
          type: string
          format: date-time

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object

  responses:
    UnauthorizedError:
      description: 認証エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "UNAUTHORIZED"
            message: "Invalid or expired token"

    NotFoundError:
      description: リソースが見つからない
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "NOT_FOUND"
            message: "Building not found"

    ValidationError:
      description: バリデーションエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

---

## 🛠️ MCP実装仕様

### MCPツール定義

#### 1. get_building_status

```typescript
{
  name: "get_building_status",
  description: "ビルの現在の状態（占有率、エネルギー使用量、システム稼働状況）を取得します",
  inputSchema: {
    type: "object",
    properties: {
      buildingId: {
        type: "string",
        description: "ビルID（省略時は環境変数のBUILDING_IDを使用）"
      }
    }
  }
}
```

#### 2. list_spaces

```typescript
{
  name: "list_spaces",
  description: "ビル内のスペース一覧を取得します。フィルタリングオプションで絞り込み可能です",
  inputSchema: {
    type: "object",
    properties: {
      buildingId: {
        type: "string"
      },
      floor: {
        type: "number",
        description: "フロア番号"
      },
      type: {
        type: "string",
        enum: ["meeting_room", "workspace", "common_area"],
        description: "スペースタイプ"
      },
      availableOnly: {
        type: "boolean",
        description: "利用可能なスペースのみ取得"
      }
    }
  }
}
```

#### 3. book_space

```typescript
{
  name: "book_space",
  description: "指定したスペースを予約します",
  inputSchema: {
    type: "object",
    required: ["spaceId", "userId", "startTime", "endTime"],
    properties: {
      buildingId: {
        type: "string"
      },
      spaceId: {
        type: "string",
        description: "スペースID"
      },
      userId: {
        type: "string",
        description: "予約者のユーザーID"
      },
      startTime: {
        type: "string",
        description: "開始時刻（ISO 8601形式）"
      },
      endTime: {
        type: "string",
        description: "終了時刻（ISO 8601形式）"
      },
      purpose: {
        type: "string",
        description: "利用目的"
      }
    }
  }
}
```

#### 4. get_energy_data

```typescript
{
  name: "get_energy_data",
  description: "エネルギー使用データを取得します",
  inputSchema: {
    type: "object",
    properties: {
      buildingId: {
        type: "string"
      },
      period: {
        type: "string",
        enum: ["hourly", "daily", "weekly", "monthly"],
        description: "データの期間",
        default: "daily"
      }
    }
  }
}
```

#### 5. request_collaboration

```typescript
{
  name: "request_collaboration",
  description: "他のビルエージェントに協力を要請します（A2A通信）",
  inputSchema: {
    type: "object",
    required: ["targetBuildingId", "task"],
    properties: {
      targetBuildingId: {
        type: "string",
        description: "要請先のビルID"
      },
      task: {
        type: "string",
        description: "協調タスク名"
      },
      params: {
        type: "object",
        description: "タスク固有のパラメータ"
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        default: "medium"
      }
    }
  }
}
```

#### 6. get_agent_capabilities

```typescript
{
  name: "get_agent_capabilities",
  description: "指定したビルエージェントの能力（提供可能な機能）を取得します",
  inputSchema: {
    type: "object",
    required: ["buildingId"],
    properties: {
      buildingId: {
        type: "string",
        description: "対象のビルID"
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

#### 2. building:///spaces

```typescript
{
  uri: "building://{buildingId}/spaces",
  name: "スペース一覧",
  description: "ビル内の全スペース情報",
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
3. **ステークホルダー別権限**

   ```typescript
   enum Role {
     TENANT = 'tenant',           // テナント：自社スペースのみ
     VISITOR = 'visitor',         // 来訪者：公共エリアのみ
     OWNER = 'owner',             // オーナー：全データ参照可
     BM = 'building_manager',     // BM：運用管理全般
     PM = 'property_manager',     // PM：契約・財務データ
     AGENT = 'agent'              // エージェント：A2A通信
   }
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
| API応答時間                  | p95 < 500ms | CloudWatch Metrics |
| MCP Tool実行時間             | p95 < 1s    | カスタムメトリクス |
| エージェント間協調レイテンシ | p95 < 2s    | X-Ray トレーシング |
| 同時リクエスト処理           | 100 req/s   | Load Testing       |

### 可用性

- SLA: 99.9%（月間ダウンタイム < 43分）
- Multi-AZ構成
- Auto Scaling設定
- ヘルスチェック実装

### スケーラビリティ

- 1ビルあたり1 MCPサーバーインスタンス
- Lambda同時実行数: 初期100、最大1000
- DynamoDB: On-Demand Capacity
- 将来的に1000棟規模に対応

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
  buildingId: string;
  requestId: string;
  message: string;
  context?: object;
  error?: Error;
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
// テスト用ビルデータ
export const mockBuildingData = {
  buildingId: 'test-building-001',
  name: 'Test Building A',
  status: {
    occupancy: { current: 100, capacity: 200, percentage: 50 },
    energyUsage: { current: 150, daily: 2500, trend: 'stable' },
    systems: { hvac: 'normal', lighting: 'normal', security: 'normal' }
  }
};

// テスト用スペースデータ
export const mockSpaces = [
  {
    spaceId: 'space-001',
    buildingId: 'test-building-001',
    floor: 3,
    name: 'Meeting Room A',
    type: 'meeting_room',
    capacity: 10,
    available: true,
    amenities: ['projector', 'whiteboard']
  }
];
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

stages:
  - lint:
      - ESLint
      - Prettier
      - TypeScript type check
  
  - test:
      - Unit tests (Vitest)
      - Integration tests
      - Coverage report
  
  - build:
      - TypeScript compile
      - Bundle optimization
      - Lambda package creation
  
  - deploy:
      - CDK diff
      - Manual approval (Production)
      - CDK deploy
      - Smoke tests
```

### デプロイ戦略

- **Blue/Green Deployment**: Lambda Aliasを使用
- **カナリアリリース**: 10% → 50% → 100%
- **ロールバック**: 5分以内に前バージョンに戻せること

---

## 📝 環境変数

```bash
# .env.example

# Building Configuration
BUILDING_ID=building-001
BUILDING_NAME=Example Building A

# Building OS API
BUILDING_OS_API_URL=https://api.building-os.example.com/v1
API_KEY=your-api-key-here

# AWS Configuration
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012

# Authentication
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Performance
API_TIMEOUT_MS=30000
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=1000

# Feature Flags
ENABLE_A2A_COLLABORATION=true
ENABLE_REALTIME_UPDATES=false
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
- [ ] MCPサーバー骨格実装
- [ ] Building OS APIクライアント実装
- [ ] ユニットテスト整備

### Phase 2: コア機能実装（6週間）

- [ ] ビル管理ツール実装
- [ ] スペース管理ツール実装
- [ ] エネルギー管理ツール実装
- [ ] 統合テスト

### Phase 3: A2A機能実装（4週間）

- [ ] エージェント協調ツール実装
- [ ] 複数ビル間通信プロトコル確立
- [ ] エージェント能力検索機能

### Phase 4: インフラ・デプロイ（3週間）

- [ ] AWS CDK スタック実装
- [ ] CI/CDパイプライン構築
- [ ] Staging環境デプロイ
- [ ] 負荷テスト

### Phase 5: 本番リリース（2週間）

- [ ] Production環境デプロイ
- [ ] 監視・アラート設定
- [ ] ドキュメント整備
- [ ] 運用手順書作成

---

## 🔄 今後の拡張計画

### Short-term (3-6ヶ月)

- リアルタイムイベント通知（WebSocket）
- ダッシュボードUI構築
- モバイルアプリ連携

### Mid-term (6-12ヶ月)

- 機械学習による予測機能
  - 占有率予測
  - エネルギー最適化
- 外部サービス連携（天気API、交通情報等）
- マルチリージョン展開

### Long-term (12ヶ月以降)

- 都市スケールの協調制御
- カーボンニュートラル管理
- デジタルツイン統合
- サードパーティーエコシステム構築

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
