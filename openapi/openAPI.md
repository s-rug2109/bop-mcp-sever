AWS API Gateway の Swagger (OpenAPI) インポート機能を使って、APIのリソース定義だけでなく、バックエンドの **Lambda 連携設定 (`x-amazon-apigateway-integration`)** や **Cognito オーソライザー設定 (`x-amazon-apigateway-authorizer`)** までを一括で構築できる完全版 YAML ファイルを管理します。

このファイルを使用すれば、コンソールでポチポチと設定する手間を省き、Infrastructure as Code (IaC) のようにAPI定義を管理できます。

### 事前準備: 変数の置換

利用する前に、以下の文字列をご自身の環境に合わせて一括置換してください。

| 環境変数名                             | 説明                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| **AWS_REGION**                   | API Gateway統合で使用するAWSリージョン（例:`ap-northeast-1`）       |
| **COGNITO_USER_POOL_ARN**        | API Gatewayオーソライザーとして設定するCognito User PoolのARN         |
| **LAMBDA_AUTH_ARN**              | 認証機能（ログイン、トークン更新）を担当するLambda関数のARN           |
| **LAMBDA_DIGITAL_TWIN_ARN**      | デジタルツイン検索・更新を担当するLambda関数のARN                     |
| **LAMBDA_POINT_DATA_ARN**        | ポイントデータ（最新値・履歴）取得を担当するLambda関数のARN           |
| **LAMBDA_CONTROL_ARN**           | 機器制御コマンドの送信処理を担当するLambda関数のARN                   |
| **LAMBDA_SCHEDULE_ARN**          | スケジュールのCRUD管理を担当するLambda関数のARN                       |
| **LAMBDA_PRESET_ARN**            | プリセット（シーン）のCRUD管理および一括実行を担当するLambda関数のARN |
| **LAMBDA_HISTORY_ARN**           | 操作ログやイベント履歴の参照を担当するLambda関数のARN                 |
| **LAMBDA_COLD_ARN**              | Athenaを利用した大規模データ抽出タスク管理を担当するLambda関数のARN   |
| **LAMBDA_WEBSOCKET_HANDLER_ARN** | WebSocket APIの接続・メッセージ処理を担当するLambda関数のARN          |

---

## 1. Auth API (認証)

認証用のAPIでCognitoをベースにユーザーのログイン処理およびリフレッシュトークンによるセッション更新を提供します。

```yaml
openapi: 3.0.1
info:
  title: Smart Building Auth API
  description: |
    認証専用API。
    ユーザーのログイン処理およびリフレッシュトークンによるセッション更新を提供します。
  version: 1.0.0

components:
  schemas:
    # --- Requests ---
    LoginRequest:
      type: object
      description: ログインに必要な認証情報
      required: [username, password]
      properties:
        username: 
          type: string
          description: ユーザー名またはメールアドレス
          example: "admin@example.com"
        password: 
          type: string
          format: password
          description: パスワード
          example: "P@ssword123"

    RefreshTokenRequest:
      type: object
      description: トークン更新リクエスト
      required: [refresh_token]
      properties:
        refresh_token: 
          type: string
          description: ログイン時に取得したリフレッシュトークン
          example: "eyJjdHkiOiJKV1QiLCJlbmMiOiJ..."

    # --- Responses ---
    AuthResponse:
      type: object
      description: 認証成功時のトークンセット
      properties:
        access_token:
          type: string
          description: APIアクセス用JWT
        id_token:
          type: string
          description: OpenID Connect IDトークン
        refresh_token:
          type: string
          description: トークン更新用トークン
        expires_in:
          type: integer
          description: アクセストークンの有効期限（秒）
          example: 3600
        token_type:
          type: string
          example: "Bearer"

    ErrorResponse:
      type: object
      properties:
        message:
          type: string
          example: "Authentication failed"

paths:
  /auth/login:
    post:
      summary: ログイン
      description: ユーザー名とパスワードで認証を行い、各種トークンを発行します。
      security: []
      requestBody:
        description: ユーザー認証情報
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: 認証成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: 認証失敗（パスワード不一致など）
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_AUTH_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  /auth/refresh:
    post:
      summary: トークン更新
      description: 有効なリフレッシュトークンを使用して、新しいアクセストークンを取得します。
      security: []
      requestBody:
        description: リフレッシュトークン情報
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefreshTokenRequest'
      responses:
        '200':
          description: 更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: トークン無効または期限切れ
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_AUTH_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy
```

---

## 2. Hot API (IoT操作)

主にHotデータを取り扱う統合APIで、デジタルツイン検索やデバイス制御機能を提供します。

```yaml
openapi: 3.0.1
info:
  title: Smart Building Hot API
  description: |
    スマートビルのIoTデバイス制御、スケジュール管理、デジタルツイン検索を行う統合API。
    認証にはCognito User PoolのIDトークンが必要です。
  version: 1.0.0

components:
  securitySchemes:
    CognitoAuth:
      type: apiKey
      description: Cognito User Poolから発行されたID TokenをAuthorizationヘッダーに設定してください。
      name: Authorization
      in: header
      x-amazon-apigateway-authtype: cognito_user_pools
      x-amazon-apigateway-authorizer:
        type: cognito_user_pools
        providerARNs:
          - "${COGNITO_USER_POOL_ARN}"

  schemas:
    # --- Common ---
    ErrorResponse:
      type: object
      properties:
        error_code:
          type: string
          example: "INVALID_PARAMETER"
        message:
          type: string
          example: "The provided point_id does not exist."

    # --- Command ---
    CommandItem:
      type: object
      description: 個別の制御コマンド
      required: [point_id, value]
      properties:
        point_id:
          type: string
          description: 制御対象のポイントUUID
          example: "550e8400-e29b-41d4-a716-446655440000"
        value:
          type: number
          description: 設定値（温度、ON/OFFフラグ等）
          example: 24.5

    # --- Schedule ---
    ScheduleCreateRequest:
      type: object
      description: 新規スケジュール作成リクエスト
      required: [type, point_id, value]
      properties:
        type:
          type: string
          enum: [ONE_TIME, RECURRING]
          description: "ONE_TIME: 一回のみ実行, RECURRING: 繰り返し実行"
        point_id:
          type: string
          description: 対象ポイントUUID
          example: "550e8400-e29b-41d4-a716-446655440000"
        value:
          type: number
          description: 実行時に設定する値
          example: 1
        at_time:
          type: string
          description: "ONE_TIMEの場合の実行日時 (ISO8601形式)"
          example: "2026-01-01T10:00:00Z"
        cron_expression:
          type: string
          description: "RECURRINGの場合のCRON式 (AWS EventBridge形式)"
          example: "cron(0 10 ? * MON-FRI *)"

    ScheduleDeleteRequest:
      type: object
      required: [schedule_ids]
      properties:
        schedule_ids:
          type: array
          description: 削除するスケジュールのIDリスト
          items:
            type: string
            format: uuid

    # --- Preset ---
    PresetCreateRequest:
      type: object
      required: [name, commands]
      properties:
        name:
          type: string
          description: プリセット名（例：全館空調ON）
          example: "Morning Startup"
        commands:
          type: array
          description: 実行されるコマンドのリスト
          items:
            $ref: '#/components/schemas/CommandItem'

    PresetDeleteRequest:
      type: object
      required: [preset_ids]
      properties:
        preset_ids:
          type: array
          items:
            type: string
            format: uuid

    PresetExecuteRequest:
      type: object
      required: [preset_ids]
      properties:
        preset_ids:
          type: array
          description: 即時実行するプリセットIDのリスト
          items:
            type: string
            format: uuid

    # --- Digital Twin ---
    DigitalTwinSearchRequest:
      type: object
      description: デジタルツイン検索クエリ
      required: [query_type]
      properties:
        query_type:
          type: string
          enum: [topology, children, filter, details]
          description: |
            - topology: 空間・設備の階層構造を取得
            - children: 親ノード直下の子要素を取得
            - filter: メタデータによるフィルタ検索
            - details: ID指定による詳細情報取得
        depth:
          type: string
          enum: [Space, Equipment, Point]
          description: "topology検索時の深さ制限"
        point_id:
          oneOf:
            - type: string
            - type: array
              items: {type: string}
          description: "children検索時は親UUID(string)、details検索時は対象UUIDリスト(array)"
        entity_id:
          oneOf:
            - type: string
            - type: array
              items: {type: string}
          description: "AWS TwinMakerのEntityId（UUIDではなく内部IDを使用する場合）"
        filters:
          type: object
          description: "key-valueペアによるフィルタ条件 (例: { 'manufacturer': 'Daikin' })"
          example:
            tag: "hvac"
            floor: "1F"

    # --- Point Data ---
    PointDataLatestRequest:
      type: object
      required: [point_id]
      properties:
        point_id:
          type: array
          items:
            type: string
            format: uuid
          description: 最新値を取得したいポイントUUIDのリスト

    PointDataHistoryRequest:
      type: object
      required: [point_id]
      properties:
        point_id:
          type: array
          items:
            type: string
            format: uuid
          description: 履歴を取得したいポイントUUIDのリスト
        start_time:
          type: string
          format: date-time
          description: "検索開始日時 (ISO8601)"
          example: "2026-01-01T00:00:00Z"
        end_time:
          type: string
          format: date-time
          description: "検索終了日時 (ISO8601)"
          example: "2026-01-02T00:00:00Z"
        scan_forward:
          type: boolean
          default: true
          description: "true: 古い順(昇順), false: 新しい順(降順)"

security:
  - CognitoAuth: []

paths:
  # ==========================================
  # デジタルツイン (Digital Twin) API
  # ==========================================
  /digital-twin/search:
    post:
      summary: デジタルツイン情報検索・取得
      description: クエリタイプに応じたツイン情報（トポロジー、属性、親子関係）を取得します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DigitalTwinSearchRequest'
      responses:
        '200':
          description: 検索成功
          content:
            application/json:
              schema:
                type: object
                description: 検索結果（構造はクエリタイプによる）
        '400':
          description: クエリパラメータ不正
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_DIGITAL_TWIN_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  /digital-twin/{entity_id}:
    patch:
      summary: デジタルツイン情報更新
      description: 指定したエンティティIDのメタデータ（属性値など）を更新します。
      parameters:
        - in: path
          name: entity_id
          required: true
          schema:
            type: string
          description: 更新対象のTwinMakerエンティティID
      requestBody:
        content:
          application/json:
            schema:
              type: object
              example:
                description: "Updated description via API"
              description: 更新するプロパティのKey-Value
      responses:
        '200':
          description: 更新成功
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_DIGITAL_TWIN_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  # ==========================================
  # ポイントデータ (Point Data) API
  # ==========================================
  /point-data/latest:
    post:
      summary: 最新値取得
      description: 指定UUIDリストの現在の値（キャッシュまたはリアルタイム）を取得します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PointDataLatestRequest'
      responses:
        '200':
          description: 取得成功
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_POINT_DATA_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  /point-data/history:
    post:
      summary: 履歴データ取得
      description: 指定期間内の時系列データを取得します。DynamoDB/Timestream等の制限により最大取得件数がある場合があります。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PointDataHistoryRequest'
      responses:
        '200':
          description: 取得成功
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_POINT_DATA_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  # ==========================================
  # 制御 (Command) API
  # ==========================================
  /command:
    post:
      summary: 機器制御コマンド送信
      description: 複数の機器に対して制御コマンドを一括送信します。
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                commands:
                  type: array
                  items:
                    $ref: '#/components/schemas/CommandItem'
      responses:
        '200':
          description: コマンド受付完了（一部失敗の可能性あり）
          content:
            application/json:
              example:
                message: "Batch processing completed"
                results:
                  - twin_point_id: "550e8400-e29b-41d4-a716-446655440000"
                    status: "SUCCESS"
                    message: "Command sent"
                    event_id: "uuid-for-tracking-1"
                    gateway_id: "gw-ecs-fargate"
                  - twin_point_id: "550e8400-e29b-41d4-a716-446655440099"
                    status: "FORBIDDEN"
                    message: "Access Denied for user..."
        '400':
          description: リクエスト不正 (JSON形式エラー、必須項目欠落など)
        '401':
          description: 認証エラー
        '502':
          description: デバイス通信エラー
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_CONTROL_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  # ==========================================
  # スケジュール (Schedule) API
  # ==========================================
  /schedule:
    get:
      summary: 登録済みスケジュール一覧取得
      responses:
        '200':
          description: 一覧取得成功
          content:
            application/json:
              example:
                message: "Success"
                schedules:
                  - schedule_id: "sched-uuid-1"
                    schedule_name: "iot-sched-uuid-1"
                    type: "RECURRING"
                    expression: "cron(0 9 * * ? *)"
                    twin_point_id: "550e8400-..."
                    value: "1"
                    status: "ACTIVE"
                  - schedule_id: "sched-uuid-2"
                    type: "ONE_TIME"
                    expression: "at(2026-12-31T23:59:00)"
                    twin_point_id: "550e8400-..."
                    value: "25.5"
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_SCHEDULE_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    post:
      summary: スケジュール登録
      description: 定期実行または単発実行のスケジュールを作成します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ScheduleCreateRequest'
      responses:
        '200':
          description: 作成成功
          content:
            application/json:
              example:
                message: "Schedule created"
                schedule_id: "sched-uuid-new"
        '400':
          description: パラメータ不正 (Cron式エラー、過去の日時など)
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_SCHEDULE_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    delete:
      summary: スケジュール削除 (一括)
      description: 指定したIDのスケジュールを削除します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ScheduleDeleteRequest'
      responses:
        '200':
          description: 削除処理完了
          content:
            application/json:
              example:
                message: "Batch delete completed"
                deleted_ids:
                  - "sched-uuid-1"
                  - "sched-uuid-2"
                errors: []
        '400':
          description: IDリストが空、または不正
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_SCHEDULE_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  # ==========================================
  # プリセット (Preset) API
  # ==========================================
  /presets:
    get:
      summary: プリセット一覧取得
      responses:
        '200':
          description: 成功
          content:
            application/json:
              example:
                message: "Success"
                presets:
                  - preset_id: "preset-uuid-1"
                    name: "Morning Mode"
                    commands:
                      - twin_point_id: "uuid-light-1"
                        value: 1
                      - twin_point_id: "uuid-ac-1"
                        value: 26
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_PRESET_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    post:
      summary: プリセット新規登録
      description: 複数の制御コマンドをまとめた「プリセット（シーン）」を定義します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PresetCreateRequest'
      responses:
        '200':
          description: 作成成功
          content:
            application/json:
              example:
                message: "Preset created"
                preset_id: "preset-uuid-new"
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_PRESET_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    delete:
      summary: プリセット削除 (一括)
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PresetDeleteRequest'
      responses:
        '200':
          description: 削除処理完了
          content:
            application/json:
              example:
                message: "Batch delete completed"
                deleted_ids: ["preset-uuid-1"]
                errors: []
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_PRESET_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  /presets/execute:
    post:
      summary: プリセット実行 (一括)
      description: 定義済みのプリセットIDを指定して、関連付けられたコマンドを即時実行します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PresetExecuteRequest'
      responses:
        '200':
          description: 実行リクエスト完了
          content:
            application/json:
              example:
                message: "Batch execution completed"
                results:
                  - preset_id: "preset-uuid-1"
                    preset_name: "Morning Mode"
                    twin_point_id: "uuid-light-1"
                    status: "SUCCESS"
                    event_id: "trace-id-1"
                    gateway_id: "gw-ecs-fargate"
                  - preset_id: "preset-uuid-1"
                    twin_point_id: "uuid-ac-1"
                    status: "FAILED"
                    message: "Device not found"
        '404':
          description: 指定されたプリセットIDが存在しない
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_PRESET_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

  # ==========================================
  # 履歴 (History) - Legacy/Audit
  # ==========================================
  /history:
    get:
      summary: 操作/イベントログ参照
      description: PointDataの履歴ではなく、ユーザー操作やシステムイベントの履歴を参照します。
      parameters:
        - in: query
          name: event_id
          schema: {type: string}
          description: 特定イベントのIDフィルタ
        - in: query
          name: point_id
          schema: {type: string}
          description: 特定ポイントに関連するログフィルタ
      responses:
        '200':
          description: 検索成功
          content:
            application/json:
              example:
                message: "Success"
                count: 2
                history:
                  - event_id: "a1b2c3d4-e5f6-4a5b-9c8d-112233445566"
                    timestamp: "2026-01-07T15:00:00+09:00"
                    user_id: "user-admin"
                    gateway_id: "gw-ecs-fargate"
                    point_id: "550e8400-e29b-41d4-a716-446655440000"
                    command_value: "1"
                    status: "SUCCESS"
                  - event_id: "b2c3d4e5-f6a7-5b8c-0d9e-223344556677"
                    timestamp: "2026-01-07T14:55:00+09:00"
                    user_id: "user-floor1"
                    point_id: "550e8400-e29b-41d4-a716-446655440099"
                    status: "FORBIDDEN"
                    error_message: "Access Denied for user user-floor1"
        '401':
          description: 認証エラー (IDトークン無効/期限切れ)
        '500':
          description: サーバー内部エラー
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_HISTORY_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy
```

---

## 3. Cold API (データ抽出)

主にColdデータを取り扱う統合APIで、過去の蓄積されたデータの取得や部分的な集計結果を提供します。

```yaml
openapi: 3.0.1
info:
  title: Cold Data Extraction API
  description: |
    Athenaを利用してS3からデータを抽出し、署名付きURLを発行するAPI。
    処理は非同期で行われ、完了通知はWebhookまたはポーリングで確認します。
    認証にはCognito User PoolのIDトークンが必要です。
  version: 1.0.0

components:
  securitySchemes:
    CognitoAuth:
      type: apiKey
      description: Cognito User Poolから発行されたID TokenをAuthorizationヘッダーに設定してください。
      name: Authorization
      in: header
      x-amazon-apigateway-authtype: cognito_user_pools
      x-amazon-apigateway-authorizer:
        type: cognito_user_pools
        providerARNs:
          - "${COGNITO_USER_POOL_ARN}"

  schemas:
    # --- Common ---
    ErrorResponse:
      type: object
      properties:
        message:
          type: string
          example: "Invalid parameter: taskId is required"

    # --- Base Schema ---
    TaskBase:
      type: object
      properties:
        taskId:
          type: string
          format: uuid
        status:
          type: string
          enum: [PENDING, PROCESSING, COMPLETED, FAILED, SCHEDULED, DISABLED, DELETED]
          description: 現在のタスクステータス
        execType:
          type: integer
          enum: [1, 2, 3]
          description: "1: 即時実行, 2: 日時指定予約, 3: 定期実行"
        startDate:
          type: string
          format: date-time
          description: データ抽出範囲（開始）
        endDate:
          type: string
          format: date-time
          description: データ抽出範囲（終了）
        fileType:
          type: string
          example: CSV
        outputUrl:
          type: string
          description: 抽出ファイルのS3格納パス
          example: "s3://bop-output/1234-5678-uuid/"
        createdTime:
          type: string
          format: date-time
        webhookUrl:
          type: string
          format: uri
          description: 完了通知先URL

    # --- Responses ---
    TaskDetail:
      allOf:
        - $ref: '#/components/schemas/TaskBase'
        - type: object
          properties:
            downloadUrls:
              type: array
              description: ダウンロード用署名付きURLのリスト（ステータスがCOMPLETED時のみ付与）
              items:
                type: object
                properties:
                  fileName:
                    type: string
                    example: "results.csv"
                  downloadUrl:
                    type: string
                    format: uri
                    description: 1時間有効なダウンロードリンク
            hasOutput:
              type: boolean
              description: 出力ファイルが存在するか

    TaskList:
      type: object
      properties:
        tasks:
          type: array
          items:
            $ref: '#/components/schemas/TaskBase'

    # --- Requests ---
    CreateTaskRequest:
      type: object
      description: タスク作成パラメータ
      required: [startDate, endDate, execType]
      properties:
        startDate:
          type: string
          format: date-time
          description: 抽出対象データの開始日時
          example: "2025-12-21T00:00:00Z"
        endDate:
          type: string
          format: date-time
          description: 抽出対象データの終了日時
          example: "2025-12-25T23:59:59Z"
        execType:
          type: integer
          description: "1=即時, 2=日時指定, 3=定期"
          example: 1
        fileType:
          type: string
          default: CSV
          enum: [CSV, JSON, PARQUET]
        webhookUrl:
          type: string
          format: uri
          description: 完了時に通知を受け取るURL
          example: "<https://api.mysystem.com/webhook/callback>"
        executionDate:
          type: string
          description: "execType=2の場合に必須。予約実行日時。形式: at(yyyy-mm-ddThh:mm:ss)"
          example: "2026-01-10T10:00:00"
        schedule:
          type: string
          description: "execType=3の場合に必須。cron式またはrate式。"
          example: "cron(0 12 * * ? *)"
        pointFilter:
          type: object
          description: "抽出対象を絞り込む条件（WHERE句に変換されます）"
          example:
            building:
              values: ["Building-A"]
            level:
              values: ["2F", "3F"]
          additionalProperties:
            type: object
            properties:
              values:
                type: array
                items:
                  type: string

    UpdateTaskRequest:
      type: object
      required: [taskId, action]
      properties:
        taskId:
          type: string
          format: uuid
        action:
          type: string
          enum: [ENABLE, DISABLE]
          description: スケジュールの再開(ENABLE)または停止(DISABLE)

    DeleteTaskRequest:
      type: object
      required: [taskId]
      properties:
        taskId:
          type: string
          format: uuid

security:
  - CognitoAuth: []

paths:
  /cold-task:
    get:
      summary: タスク一覧または詳細の取得
      description: |
        - クエリパラメータ `id` がある場合: 特定タスクの `TaskDetail` (downloadUrls付き) を返します。
        - クエリパラメータがない場合: 全タスクの `TaskList` を返します。
      parameters:
        - name: id
          in: query
          description: 取得対象のタスクID
          required: false
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 取得成功
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/TaskDetail'
                  - $ref: '#/components/schemas/TaskList'
        '404':
          description: タスクが見つかりません
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_COLD_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    post:
      summary: 新規データ抽出タスクの作成・予約
      description: |
        データの抽出リクエストを作成します。
        - 即時実行(1): 即座にStep Functionsを起動します。
        - 単発予約(2): 指定日時(executionDate)にSchedulerを設定します。
        - 定期予約(3): cron/rate式に基づき実行します。
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskRequest'
      responses:
        '200':
          description: タスク受付成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  taskId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    example: PROCESSING
                  outputUrl:
                    type: string
                    example: "s3://bop-output/uuid/"
        '500':
          description: サーバーエラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_COLD_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    put:
      summary: スケジュールの有効化・無効化
      description: "予約タスクの状態を `ENABLED` または `DISABLED` に切り替えます。"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTaskRequest'
      responses:
        '200':
          description: 更新成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  status:
                    type: string
        '404':
          description: 対象が見つかりません
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_COLD_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

    delete:
      summary: タスクの削除
      description: |
        リクエストボディで `taskId` を受け取り、スケジュールを削除、DB上のステータスを `DELETED` に変更します。
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeleteTaskRequest'
      responses:
        '200':
          description: 削除完了
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  taskId:
                    type: string
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_COLD_ARN}/invocations"
        passthroughBehavior: when_no_match
        httpMethod: POST
        type: aws_proxy

# ---------------------------------------------------------
# Webhook Callbacks (抽出完了後の外部通知)
# ---------------------------------------------------------
callbacks:
  OnExtractionCompleted:
    '{$request.body#/webhookUrl}':
      post:
        summary: データ抽出完了通知
        description: Athenaの抽出完了後、WebhookSender LambdaよりこのURLへPOST送信されます。
        requestBody:
          content:
            application/json:
              schema:
                type: object
                properties:
                  taskId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    example: COMPLETED
                  outputUrls:
                    type: array
                    items:
                      type: object
                      properties:
                        fileName:
                          type: string
                        downloadUrl:
                          type: string
                          format: uri
        responses:
          '200':
            description: 通知受理
```

---

## 4. Stream API (WebSocket)

WebSocketを用いてイベントドリブンなリアルタイムデータを提供します。

```yaml
openapi: 3.0.1
info:
  title: Smart Building IoT Stream API (WebSocket)
  description: |
    リアルタイムデータ配信用のWebSocket API定義です。

    ## 接続フロー
    1. WebSocket URLへ接続（Cognito認証等のクエリパラメータが必要な場合があります）
    2. 接続確立後、以下のJSONペイロードを送信してアクションを実行
    3. `action` プロパティの値によってルーティングされます
  version: 1.0.0

components:
  schemas:
    # --- Request Payloads ---
    SubscribeRequest:
      type: object
      description: 指定したポイントIDのデータ変更通知を購読します。
      required:
        - action
        - point_id
      properties:
        action:
          type: string
          enum:
            - subscribe_points
          description: ルーティングキー
        subscription_id:
          type: string
          default: "default"
          description: "購読グループID（複数ウィンドウでの管理などに使用）"
        point_id:
          type: array
          items:
            type: string
            format: uuid
          description: "購読対象のポイントUUIDリスト"
          example: ["uuid-1", "uuid-2"]

    UnsubscribePointsRequest:
      type: object
      description: 指定したポイントIDの購読を解除します。
      required:
        - action
        - point_id
      properties:
        action:
          type: string
          enum:
            - unsubscribe_points
        subscription_id:
          type: string
          default: "default"
        point_id:
          type: array
          items:
            type: string
            format: uuid

    UnsubscribeSubscriptionRequest:
      type: object
      description: 指定したsubscription_idに紐づく全ての購読を解除します。
      required:
        - action
        - subscription_id
      properties:
        action:
          type: string
          enum:
            - unsubscribe_subscription
        subscription_id:
          type: string
          description: "一括解除するグループID"

    GetSubscriptionListRequest:
      type: object
      description: 現在の購読状況を確認します。
      required:
        - action
      properties:
        action:
          type: string
          enum:
            - get_subscription_list
        subscription_id:
          type: string
          description: 省略時は全ID、指定時は特定IDの状況を返却

    # --- Push Notification Schema ---
    PointValueUpdate:
      type: object
      description: "サーバーからプッシュ送信されるデータ更新通知"
      properties:
        point_id:
          type: string
          format: uuid
        value:
          type: number
          description: 現在の値
          example: 25.4
        timestamp:
          type: string
          format: date-time
          description: 計測時刻
        quality:
          type: string
          enum: [GOOD, BAD, UNCERTAIN]
          description: データ品質
          example: "GOOD"

# AWS API Gateway WebSocket Route Selection
x-amazon-apigateway-route-selection-expression: "$request.body.action"

paths:
  # 注意: WebSocket APIではパスは概念的なものであり、実際はJSONボディのactionで振り分けられます

  # ----------------------------------------
  # [11] 購読追加
  # ----------------------------------------
  /subscribe_points:
    post:
      summary: ポイント購読 (subscribe_points)
      description: 指定したポイントIDのデータ変更通知を購読します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubscribeRequest'
      responses:
        '200':
          description: 受付完了 (ACK)
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_WEBSOCKET_HANDLER_ARN}/invocations"
        type: aws_proxy

  # ----------------------------------------
  # [12] 購読解除 (ポイント指定)
  # ----------------------------------------
  /unsubscribe_points:
    post:
      summary: ポイント購読解除 (unsubscribe_points)
      description: 特定のポイントのみ配信を停止します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UnsubscribePointsRequest'
      responses:
        '200':
          description: 受付完了 (ACK)
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_WEBSOCKET_HANDLER_ARN}/invocations"
        type: aws_proxy

  # ----------------------------------------
  # [NEW] 購読解除 (グループ一括)
  # ----------------------------------------
  /unsubscribe_subscription:
    post:
      summary: グループ一括解除 (unsubscribe_subscription)
      description: 指定したSubscription IDに関連する全ての配信を停止します。画面遷移時などに利用します。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UnsubscribeSubscriptionRequest'
      responses:
        '200':
          description: 受付完了 (ACK)
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_WEBSOCKET_HANDLER_ARN}/invocations"
        type: aws_proxy

  # ----------------------------------------
  # [13] 購読リスト確認
  # ----------------------------------------
  /get_subscription_list:
    post:
      summary: 購読リスト確認 (get_subscription_list)
      description: 現在サーバー側で管理している購読リストをリクエストします。結果は非同期メッセージとして返却されます。
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetSubscriptionListRequest'
      responses:
        '200':
          description: 受付完了 (結果は別途送信)
      x-amazon-apigateway-integration:
        uri: "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_WEBSOCKET_HANDLER_ARN}/invocations"
        type: aws_proxy

```
