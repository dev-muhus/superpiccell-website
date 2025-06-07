# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Super Piccell** is a next-generation Web3 media franchise platform that combines social networking features with immersive 3D gaming experiences. It integrates SNS functionality, blockchain technology, and interactive games into a unified platform.

## Development Environment

This project uses a **fully containerized Docker environment** with hot reload capabilities. The development server runs inside Docker containers and automatically reflects code changes without requiring manual restarts.

**CRITICAL RULE**: Direct npm commands on the host system are PROHIBITED for this project. All project-related npm commands MUST be executed via Docker Compose to ensure consistency with the containerized environment.

**Important Notes:**
- The development server runs inside Docker containers with hot reload enabled
- Code changes are automatically reflected without needing to restart the server
- DO NOT run `npm run dev` or similar commands on the host system
- The containerized environment handles all development needs
- Server restarts are typically unnecessary due to hot reload
- If server restart is needed, use: `docker compose restart frontend`

## CRITICAL: Verification Requirements

**MANDATORY VERIFICATION BEFORE ANY COMPLETION CLAIMS**:
All implementation work MUST be verified with actual evidence before making completion claims. The following verification steps are REQUIRED:

### Database Changes Verification
1. **Schema Changes**: MUST verify database schema with actual queries
   ```bash
   # REQUIRED: Check actual database schema
   docker compose run --rm frontend npx tsx -e "
   import { db } from './src/db/index.js';
   import { sql } from 'drizzle-orm';
   
   async function verifySchema() {
     const result = await db.execute(sql\`
       SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'TABLE_NAME' 
       ORDER BY ordinal_position;
     \`);
     console.log('Schema verification:', result.rows);
   }
   verifySchema();
   "
   ```

2. **Migration Verification**: MUST confirm migrations were actually applied
3. **Data Verification**: MUST verify actual data operations work

### API Implementation Verification
1. **Test Execution**: MUST run and pass all relevant tests
   ```bash
   # REQUIRED: Run specific API tests
   docker compose run --rm frontend npm run test:api -- __tests__/api/path/to/test
   ```

2. **Manual API Testing**: MUST verify API endpoints actually respond correctly
3. **Integration Testing**: MUST confirm end-to-end functionality works

### UI Implementation Verification
1. **Component Testing**: MUST verify UI components render and function correctly
2. **Integration Testing**: MUST verify UI integrates with backend APIs
3. **User Flow Testing**: MUST verify complete user workflows work

### **VIOLATION CONSEQUENCES**:
- Any completion claim without verification is considered **fraud and deception**
- No implementation is considered complete without actual evidence
- All claims must be backed by concrete verification results

**COMPLIANCE REQUIREMENT**:
Every task completion MUST include verification evidence. No exceptions.

## Essential Commands

**EXCEPTIONS ALLOWED**:
- Global MCP server installations (e.g., `npm install -g @upstash/context7-mcp`)
- Claude Desktop / Claude Code related global installations
- System-wide development tools unrelated to this specific project

**VIOLATION EXAMPLES** (DO NOT DO):
- `npm install` (in project directory)
- `npm run dev` (direct execution)
- `npm run test` (direct execution)
- `npm run build` (direct execution)

**CORRECT APPROACH**:
- Use `docker compose run --rm frontend npm install`
- Use `docker compose run --rm frontend npm run dev`
- Use `docker compose run --rm frontend npm run test`

### Development
```bash
# Start development environment (all services including hot reload)
docker compose up -d           # Start all services with Docker (http://localhost:3000)
                              # Hot reload is automatically enabled - code changes are reflected instantly

# DO NOT run these on host system:
# npm run dev                  # PROHIBITED - use Docker instead
# npm start                    # PROHIBITED - use Docker instead

# If you need to run dev server manually (rarely needed):
docker compose run --rm frontend npm run dev  # Only if containers are not running

# Server restart (rarely needed due to hot reload):
docker compose restart frontend              # Restart frontend service if needed
docker compose restart                       # Restart all services if needed
```

### Database Operations
```bash
# All database operations should use Docker Compose
docker compose run --rm frontend npm run db:generate            # Generate Drizzle migrations after schema changes
docker compose run --rm frontend npm run db:migrate             # Apply migrations to development database
docker compose run --rm frontend npm run db:migrate:production  # Apply migrations to production database
docker compose run --rm frontend npm run db:studio              # Open Drizzle Studio for database exploration
docker compose run --rm frontend npm run db:verify              # Verify database connection
docker compose run --rm frontend npm run db:reset               # Reset database (dangerous!)
```

### Testing
```bash
# All testing commands should use Docker Compose
docker compose run --rm frontend npm run test                   # Run all tests
docker compose run --rm frontend npm run test:api               # Run API tests only
docker compose run --rm frontend npm run test:watch             # Run tests in watch mode
docker compose run --rm frontend npm run test:coverage          # Run tests with coverage

# Single test file example
docker compose run --rm frontend npm run test:api -- __tests__/api/posts/posts.test.ts
```

### Code Quality
```bash
# Code quality checks should use Docker Compose
docker compose run --rm frontend npm run lint                   # Run ESLint
docker compose run --rm frontend npm run build                  # Build for production (also runs type checking)
```

### Package Management
```bash
# Package installation should use Docker Compose
docker compose run --rm frontend npm install                    # Install dependencies
docker compose run --rm frontend npm install <package-name>     # Install specific package
docker compose run --rm frontend npm uninstall <package-name>   # Uninstall package
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 14 with App Router (no Pages Router)
- **Language**: TypeScript with strict mode
- **Database**: Drizzle ORM with Neon PostgreSQL
- **Authentication**: Clerk with webhook sync
- **Media Storage**: Cloudinary (images), Cloudflare R2 (videos)
- **UI**: Tailwind CSS + shadcn/ui components
- **3D Games**: React Three Fiber with Zustand state management
- **Web3**: Alchemy SDK + Web3.js for blockchain integration
- **CMS**: Contentful for content management

### Project Structure
```
frontend/
├── src/
│   ├── app/              # App Router pages and API routes
│   │   ├── api/          # API endpoints (all use route.ts)
│   │   ├── games/        # Game pages and layouts
│   │   └── (pages)       # UI pages (compose, timeline, profile, etc.)
│   ├── components/       # React components
│   │   ├── games/        # Game-specific components
│   │   │   ├── common/   # Shared game components
│   │   │   └── nag-won/  # Nag-Won game components
│   │   └── ui/           # shadcn/ui components
│   ├── db/               # Database schema and connection
│   ├── hooks/            # Custom React hooks
│   │   └── games/        # Game-specific hooks
│   └── utils/            # Shared utilities
├── __tests__/            # Integration tests (mirrors API structure)
└── drizzle/              # Database migrations
```

### API Development Pattern

All API routes follow this structure:
```typescript
// src/app/api/[resource]/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/db';

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  
  // Use Drizzle ORM for database operations
  // Always check for blocked users
  // Use cursor-based pagination for lists
}
```

### Database Schema Updates

1. Modify schema in `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Test locally: `npm run db:migrate`
4. Apply to production: `npm run db:migrate:production`

### Key Architectural Decisions

- **Server Components by Default**: Use "use client" only when needed
- **Soft Deletes**: Use `is_deleted` flags, never hard delete
- **Cursor Pagination**: All list endpoints use cursor-based pagination
- **Block Logic**: User blocks are checked in all relevant queries
- **Media Limits**: Maximum 2 attachments per post
- **Authentication**: Clerk handles all auth, synced via webhooks
- **No Direct External APIs**: Server Components or API routes handle all external calls
- **Drizzle ORM Patterns**: Avoid `findFirst()` method, use `select().from().where().limit(1)` instead
- **Game State Management**: Zustand for game-specific state, React hooks for component state

### Testing Guidelines

- Tests use a separate Docker database container
- API tests are integration tests with real database
- Test files mirror the API route structure
- Authentication is bypassed in test environment with TEST_USER_ID

## Core Features

### SNS Functionality
The platform provides comprehensive social networking features:

**Content Creation & Management:**
- **Posts**: Text posts, replies, quotes, reposts (stored in unified `posts` table)
- **Media**: Images (Cloudinary) and videos (R2) with max 2 attachments per post
- **Drafts**: Save incomplete posts with media for later publishing
- **Post Types**: `original`, `reply`, `quote`, `repost` using single table design

**User Interactions:**
- **Likes**: Toggle-based like system with optimistic UI
- **Bookmarks**: Save posts for later viewing
- **Follows**: User relationship management
- **Blocks**: Hide content from specific users
- **Engagement**: Track user activity (likes, comments)

**Content Discovery:**
- **Timeline**: Chronological feed of followed users' posts
- **Profile Pages**: User-specific post listings
- **Infinite Scroll**: Cursor-based pagination for all feeds

### Database Schema Design

**Core Tables:**
- `users` - User profiles synced with Clerk authentication
- `posts` - Unified table for all post types (original, reply, quote, repost)
- `post_media` - Media attachments (images/videos) linked to posts
- `likes`, `bookmarks`, `follows`, `blocks` - User interaction tables
- `drafts` + `draft_media` - Temporary content storage

**Key Schema Patterns:**
- **Soft Deletes**: All tables use `is_deleted` + `deleted_at` fields
- **Self-Referencing**: Posts reference other posts via `in_reply_to_post_id`, `quote_of_post_id`
- **User Safety**: `is_banned`, `is_deleted` flags for user management
- **Media Management**: Separate media tables with cascade deletes

### Game System
- **Nag-Won**: 3D item collection game with multiple stages
- **Scoring**: Track scores, game time, items collected per stage
- **Leaderboards**: Rankings with privacy filtering (blocks, bans)
- **Mobile Optimization**: Touch controls and responsive design

### Environment Variables

Critical variables that must be set:
- `DATABASE_URL` - Neon PostgreSQL connection
- `CLERK_*` - Authentication keys and webhook secret
- `CLOUDINARY_*` - Media storage credentials
- `R2_*` - Video storage credentials
- `NEXT_PUBLIC_ALCHEMY_API_KEY` - Blockchain integration
- `NEXT_PUBLIC_CONTENTFUL_*` - CMS configuration

See `example.env` and `frontend/example.env.local` for full list.

## 絶対遵守ルール（信頼性保証）

### **CRITICAL: 虚偽報告防止システム**

#### 必須検証手順
**すべての作業完了報告前に以下を必須実行:**

1. **データベーススキーマ変更時の検証**
   ```bash
   # 本番データベースの実際の状態確認（develop環境）
   docker compose run --rm frontend npm run db:migrate
   # スキーマが実際に適用されているか確認
   ```

2. **機能完了前の実証テスト**
   ```bash
   # すべてのAPIテストを実行
   docker compose run --rm frontend npm run test:api
   # テスト結果をすべて確認し、失敗があれば修正
   ```

3. **実際のデータベース状態確認**
   - Neonダッシュボードで実際のテーブル構造確認
   - 追加されたカラムが存在することを目視確認
   - テストデータでの実際の動作確認

#### 禁止事項（絶対厳守）
- **テスト結果を確認せずに「完了」と報告すること**
- **データベースマイグレーションを実行せずに「適用済み」と報告すること**
- **実際の動作確認をせずに「動作する」と報告すること**
- **スキップしたテストがあるのに「全テスト成功」と報告すること**

#### 報告形式の強制
**完了報告時は必ず以下の証拠を提示:**
1. 実行したテストコマンドとその結果
2. データベースの実際の状態確認結果
3. 各フェーズでの動作確認結果

### **環境別実行コマンド明確化**

#### Development環境（通常の開発作業）
```bash
# 開発環境でのマイグレーション
docker compose run --rm frontend npm run db:migrate

# 開発環境でのテスト
docker compose run --rm frontend npm run test:api
```

#### Production環境（本番適用時のみ）
```bash
# 本番環境でのマイグレーション（要確認プロンプト）
docker compose run --rm frontend npm run db:migrate:production
```

**CRITICAL**: `db:migrate:production`は本番環境のみ使用。開発作業では`db:migrate`を使用すること。