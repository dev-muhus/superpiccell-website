import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  // Webhookのシークレットを取得
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not set', { status: 500 });
  }

  // リクエストヘッダーを取得
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');
  
  // ヘッダーが不足している場合はエラー
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers');
    return new Response('Missing svix headers', { status: 400 });
  }

  // Webhookのボディを取得
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  // Webhookインスタンスを作成
  const wh = new Webhook(WEBHOOK_SECRET);
  
  let evt: WebhookEvent;
  
  // Webhookを検証
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }
  
  // イベントタイプを取得
  const eventType = evt.type;
  
  // ユーザー作成・更新イベントを処理
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;
    
    try {
      // 既存のユーザーを確認
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.clerk_id, id))
        .limit(1);
      
      const userData = {
        clerk_id: id,
        username: username || first_name || `user_${id.substring(0, 8)}`,
        email: email_addresses?.[0]?.email_address,
        first_name: first_name || null,
        last_name: last_name || null,
        profile_image_url: image_url || null,
        updated_at: new Date()
      };
      
      if (!existingUser) {
        // 新規ユーザーを作成
        await db.insert(users).values({
          ...userData,
          created_at: new Date(),
          is_deleted: false,
          role: 'user',
          is_banned: false,
          subscription_type: 'free',
          deleted_at: null
        });
        
      } else if (eventType === 'user.updated') {
        
        // 既存ユーザーを更新
        await db.update(users)
          .set(userData)
          .where(eq(users.clerk_id, id));
        
      }
      
      return new Response('User data processed', { status: 200 });
    } catch (error) {
      console.error('Error processing user data:', error);
      return new Response('Error processing user data', { status: 500 });
    }
  }
  
  return new Response('Webhook received', { status: 200 });
} 