# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-01-09

### Added
- Initial MCP Server implementation
- Building OS Hot API client integration
- Two core MCP tools:
  - `search_digital_twin`: Search and retrieve digital twin information
  - `get_latest_data`: Get latest point data values
- Claude Desktop integration support
- TypeScript implementation with proper type definitions
- Environment variable configuration
- OpenAPI 3.0 specifications for all 4 API domains (Auth/Hot/Cold/Stream)
- Project documentation and setup guides

### Technical Details
- Node.js 20.x with ES modules
- @modelcontextprotocol/sdk ^0.4.0
- Axios for HTTP client
- TypeScript 5.x for type safety
- Monorepo structure with pnpm workspace

### Testing
- Successfully tested with Claude Desktop
- Verified API connectivity with Building OS Hot API
- Confirmed MCP tool execution and response handling

### Configuration
- Environment-based API endpoint configuration
- Optional authentication token support
- Development and production environment separation