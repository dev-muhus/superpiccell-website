import { pgTable, serial, text, timestamp, boolean, integer, smallint, doublePrecision } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerk_id: text('clerk_id').notNull().unique(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  profile_image_url: text('profile_image_url'),
  cover_image_url: text('cover_image_url'),
  bio: text('bio'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false),
  role: text('role').notNull().default('user'),
  is_banned: boolean('is_banned').notNull().default(false),
  subscription_type: text('subscription_type').notNull().default('free')
});

// usersテーブルの型定義
export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

// 投稿テーブル
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  content: text('content'),
  post_type: text('post_type').notNull().default('original'), // original, reply, quote, repost
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  in_reply_to_post_id: integer('in_reply_to_post_id').references((): any => posts.id),
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote_of_post_id: integer('quote_of_post_id').references((): any => posts.id),
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repost_of_post_id: integer('repost_of_post_id').references((): any => posts.id),
  conversation_id: integer('conversation_id'),
  media_count: smallint('media_count').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false),
  is_hidden: boolean('is_hidden').notNull().default(false),
  hidden_at: timestamp('hidden_at'),
  hidden_reason: text('hidden_reason'),
  report_count: integer('report_count').default(0)
});

// postsテーブルの型定義
export type Post = InferSelectModel<typeof posts>;
export type InsertPost = InferInsertModel<typeof posts>;

// 投稿メディア
export const post_media = pgTable('post_media', {
  id: serial('id').primaryKey(),
  post_id: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  media_type: text('media_type').notNull(), // 'image' or 'video'
  url: text('url').notNull(),
  width: integer('width'),
  height: integer('height'),
  duration_sec: doublePrecision('duration_sec'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  is_deleted: boolean('is_deleted').notNull().default(false),
  deleted_at: timestamp('deleted_at')
});

// post_mediaテーブルの型定義
export type PostMedia = InferSelectModel<typeof post_media>;
export type InsertPostMedia = InferInsertModel<typeof post_media>;

// いいねテーブル
export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  post_id: integer('post_id').notNull().references(() => posts.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// likesテーブルの型定義
export type Like = InferSelectModel<typeof likes>;
export type InsertLike = InferInsertModel<typeof likes>;

// ブックマークテーブル
export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  post_id: integer('post_id').notNull().references(() => posts.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// bookmarksテーブルの型定義
export type Bookmark = InferSelectModel<typeof bookmarks>;
export type InsertBookmark = InferInsertModel<typeof bookmarks>;

// フォローテーブル
export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  follower_id: integer('follower_id').notNull().references(() => users.id),
  following_id: integer('following_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// followsテーブルの型定義
export type Follow = InferSelectModel<typeof follows>;
export type InsertFollow = InferInsertModel<typeof follows>;

// ブロックテーブル
export const blocks = pgTable('blocks', {
  id: serial('id').primaryKey(),
  blocker_id: integer('blocker_id').notNull().references(() => users.id),
  blocked_id: integer('blocked_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// blocksテーブルの型定義
export type Block = InferSelectModel<typeof blocks>;
export type InsertBlock = InferInsertModel<typeof blocks>;

// コミュニティテーブル
export const communities = pgTable('communities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  creator_id: integer('creator_id').notNull().references(() => users.id),
  is_private: boolean('is_private').default(false),
  member_count: integer('member_count').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// communitiesテーブルの型定義
export type Community = InferSelectModel<typeof communities>;
export type InsertCommunity = InferInsertModel<typeof communities>;

// コミュニティメンバーテーブル
export const community_members = pgTable('community_members', {
  id: serial('id').primaryKey(),
  community_id: integer('community_id').notNull().references(() => communities.id),
  user_id: integer('user_id').notNull().references(() => users.id),
  role: text('role').default('member'), // admin, moderator, member
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// community_membersテーブルの型定義
export type CommunityMember = InferSelectModel<typeof community_members>;
export type InsertCommunityMember = InferInsertModel<typeof community_members>;

// コミュニティ投稿関連テーブル
export const community_posts = pgTable('community_posts', {
  id: serial('id').primaryKey(),
  community_id: integer('community_id').notNull().references(() => communities.id),
  post_id: integer('post_id').notNull().references(() => posts.id),
  is_pinned: boolean('is_pinned').default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// community_postsテーブルの型定義
export type CommunityPost = InferSelectModel<typeof community_posts>;
export type InsertCommunityPost = InferInsertModel<typeof community_posts>;

// 下書きテーブル
export const drafts = pgTable('drafts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  content: text('content'),
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  in_reply_to_post_id: integer('in_reply_to_post_id').references((): any => posts.id),
  media_count: smallint('media_count').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// draftsテーブルの型定義
export type Draft = InferSelectModel<typeof drafts>;
export type InsertDraft = InferInsertModel<typeof drafts>;

// 下書きメディアテーブル
export const draft_media = pgTable('draft_media', {
  id: serial('id').primaryKey(),
  draft_id: integer('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  media_type: text('media_type').notNull(), // 'image' or 'video'
  url: text('url').notNull(),
  width: integer('width'),
  height: integer('height'),
  duration_sec: doublePrecision('duration_sec'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  is_deleted: boolean('is_deleted').notNull().default(false),
  deleted_at: timestamp('deleted_at')
});

// draft_mediaテーブルの型定義
export type DraftMedia = InferSelectModel<typeof draft_media>;
export type InsertDraftMedia = InferInsertModel<typeof draft_media>;

// ゲームスコアテーブル
export const game_scores = pgTable('game_scores', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  game_id: text('game_id').notNull(), // 'nag-won', 'future-game' など
  stage_id: text('stage_id').notNull(), // 'cyber-city', 'forest', 'volcano' など
  score: integer('score').notNull(),
  game_time: integer('game_time').notNull(), // ゲーム時間（秒）
  items_collected: integer('items_collected').default(0), // 収集したアイテム数
  difficulty: text('difficulty').default('normal'), // 'easy', 'normal', 'hard'
  created_at: timestamp('created_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false)
});

// game_scoresテーブルの型定義
export type GameScore = InferSelectModel<typeof game_scores>;
export type InsertGameScore = InferInsertModel<typeof game_scores>; 