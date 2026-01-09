#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BuildingOSClient } from './client.js';
import { DigitalTwinSearchRequest, PointDataLatestRequest } from './types.js';

class BuildingOSMCPServer {
  private server: Server;
  private client: BuildingOSClient;

  constructor() {
    this.server = new Server(
      {
        name: 'building-os-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.client = new BuildingOSClient();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_digital_twin',
            description: 'デジタルツイン情報を検索・取得します',
            inputSchema: {
              type: 'object',
              required: ['query_type'],
              properties: {
                query_type: {
                  type: 'string',
                  enum: ['topology', 'children', 'filter', 'details'],
                  description: '検索タイプ'
                },
                depth: {
                  type: 'string',
                  enum: ['Space', 'Equipment', 'Point'],
                  description: 'topology時の取得階層深さ'
                },
                point_id: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: '対象のUUIDリスト'
                },
                filters: {
                  type: 'object',
                  description: 'フィルタ条件'
                }
              }
            }
          },
          {
            name: 'get_latest_data',
            description: '指定したポイントの最新値を取得します',
            inputSchema: {
              type: 'object',
              required: ['point_id'],
              properties: {
                point_id: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '取得対象のUUIDリスト'
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_digital_twin':
            return await this.handleSearchDigitalTwin(args as DigitalTwinSearchRequest);
          
          case 'get_latest_data':
            return await this.handleGetLatestData(args as PointDataLatestRequest);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  private async handleSearchDigitalTwin(args: DigitalTwinSearchRequest) {
    const result = await this.client.searchDigitalTwin(args);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to search digital twin');
    }

    return {
      content: [
        {
          type: 'text',
          text: `デジタルツイン検索結果:\n${JSON.stringify(result.data, null, 2)}`
        }
      ]
    };
  }

  private async handleGetLatestData(args: PointDataLatestRequest) {
    const result = await this.client.getLatestData(args);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get latest data');
    }

    return {
      content: [
        {
          type: 'text',
          text: `最新データ取得結果:\n${JSON.stringify(result.data, null, 2)}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Building OS MCP Server running on stdio');
  }
}

const server = new BuildingOSMCPServer();
server.run().catch(console.error);