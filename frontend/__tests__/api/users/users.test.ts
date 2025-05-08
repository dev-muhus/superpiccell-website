/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET as getFollowStatus, POST as followUser, DELETE as unfollowUser } from '@/app/api/users/[id]/follow/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, follows } from '@/db/schema';

describe('Users API', () => {
  let currentUser: any;
  let otherUser: any;

  beforeEach(async () => {
    // テストユーザーを作成
    // [currentUser, otherUser] = await Promise.all([
    //   db.insert(users).values({
    //     clerk_id: `test_user_id_${Date.now()}_1`,
    //     username: 'testuser',
    //     email: 'test@example.com',
    //     // 他の必要なフィールド
    //   }).returning().then(res => res[0]),
    //   db.insert(users).values({
    //     clerk_id: `test_user_id_${Date.now()}_2`,
    //     username: 'otheruser',
    //     email: 'other@example.com',
    //     // 他の必要なフィールド
    //   }).returning().then(res => res[0])
    // ]);
  });

  describe('User Follow API', () => {
    test('ユーザーをフォローできる', async () => {
      // TODO: 実際にAPIが実装されたらテストを実装する
      // テスト用リクエストの作成
      // const request = createTestRequest(`/api/users/${otherUser.id}/follow`, 'POST', null, {}, currentUser.clerk_id);
      // const response = await followUser(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      // expect(response.status).toBe(200);
      // const data = await response.json();
      // expect(data.success).toBe(true);
      // expect(data.followed).toBe(true);
      
      // データベースを確認
      // const followRecord = await db.query.follows.findFirst({
      //   where: (fields) => and(
      //     eq(fields.follower_id, currentUser.id),
      //     eq(fields.following_id, otherUser.id),
      //     eq(fields.is_deleted, false)
      //   )
      // });
      
      // expect(followRecord).not.toBeNull();
    });
    
    test('フォロー済みのユーザーをフォローしても重複作成されない', async () => {
      // TODO: 実際にAPIが実装されたらテストを実装する
      // 事前にフォロー関係を作成
      // await db.insert(follows).values({
      //   follower_id: currentUser.id,
      //   following_id: otherUser.id
      // });
      
      // テスト用リクエストの作成
      // const request = createTestRequest(`/api/users/${otherUser.id}/follow`, 'POST', null, {}, currentUser.clerk_id);
      // const response = await followUser(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      // expect(response.status).toBe(200);
      // const data = await response.json();
      // expect(data.success).toBe(true);
      // expect(data.followed).toBe(true);
      
      // データベースを確認
      // const followRecords = await db.select()
      //   .from(follows)
      //   .where((fields) => 
      //     and(
      //       eq(fields.follower_id, currentUser.id),
      //       eq(fields.following_id, otherUser.id),
      //       eq(fields.is_deleted, false)
      //     )
      //   );
      
      // expect(followRecords.length).toBe(1); // 重複作成されていない
    });
    
    test('自分自身をフォローすることはできない', async () => {
      // TODO: 実際にAPIが実装されたらテストを実装する
      // テスト用リクエストの作成
      // const request = createTestRequest(`/api/users/${currentUser.id}/follow`, 'POST', null, {}, currentUser.clerk_id);
      // const response = await followUser(request, { params: { id: String(currentUser.id) } });
      
      // レスポンスの検証
      // expect(response.status).toBe(400);
      // const data = await response.json();
      // expect(data.error).toBeDefined();
    });
    
    test('フォローを解除できる', async () => {
      // TODO: 実際にAPIが実装されたらテストを実装する
      // 事前にフォロー関係を作成
      // await db.insert(follows).values({
      //   follower_id: currentUser.id,
      //   following_id: otherUser.id
      // });
      
      // テスト用リクエストの作成
      // const request = createTestRequest(`/api/users/${otherUser.id}/follow`, 'DELETE', null, {}, currentUser.clerk_id);
      // const response = await unfollowUser(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      // expect(response.status).toBe(200);
      // const data = await response.json();
      // expect(data.success).toBe(true);
      // expect(data.followed).toBe(false);
      
      // データベースを確認
      // const followRecord = await db.query.follows.findFirst({
      //   where: (fields) => and(
      //     eq(fields.follower_id, currentUser.id),
      //     eq(fields.following_id, otherUser.id),
      //     eq(fields.is_deleted, false)
      //   )
      // });
      
      // expect(followRecord).toBeNull(); // 削除されているためnull
    });
    
    test('フォロー状態を取得できる', async () => {
      // TODO: 実際にAPIが実装されたらテストを実装する
      // 事前にフォロー関係を作成
      // await db.insert(follows).values({
      //   follower_id: currentUser.id,
      //   following_id: otherUser.id
      // });
      
      // テスト用リクエストの作成
      // const request = createTestRequest(`/api/users/${otherUser.id}/follow`, 'GET', null, {}, currentUser.clerk_id);
      // const response = await getFollowStatus(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      // expect(response.status).toBe(200);
      // const data = await response.json();
      // expect(data.followed).toBe(true);
    });
    
    test('未フォローの場合はfalseを返す', async () => {
      // TODO: 実際にAPIが実装されたらテストを実装する
      // テスト用リクエストの作成
      // const request = createTestRequest(`/api/users/${otherUser.id}/follow`, 'GET', null, {}, currentUser.clerk_id);
      // const response = await getFollowStatus(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      // expect(response.status).toBe(200);
      // const data = await response.json();
      // expect(data.followed).toBe(false);
    });
  });
});
