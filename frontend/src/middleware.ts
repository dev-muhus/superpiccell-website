import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* -------- privateMetadata 型 -------- */
type PrivateUsersMetadata = {
  users?: {
    is_banned?: boolean;
    is_deleted?: boolean;
  };
};

/* -------- テスト環境バイパス -------- */
function testMiddleware(req: NextRequest) {
  const isTest =
    process.env.NODE_ENV === 'test' ||
    req.headers.get('x-test-auth') === 'true' ||
    process.env.TEST_MODE === 'true';

  if (isTest) {
    const testUserId =
      req.headers.get('x-auth-user-id') || `test_user_id_${Date.now()}`;
    const headers = new Headers(req.headers);
    headers.set('x-auth-user-id', testUserId);
    return NextResponse.next({ request: { headers } });
  }
  return null;
}

/* -------- 公開ルート -------- */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/membership',
  '/about',
  '/character',
  '/core',
  '/embryo',
  '/gallery',
  '/privacy-policy',
  '/api/webhooks(.*)',
]);

/* -------- Clerk ミドルウェア -------- */
export default clerkMiddleware(async (auth, req) => {
  const testResp = testMiddleware(req);
  if (testResp) return testResp;

  if (!isPublicRoute(req)) {
    const { userId, sessionId } = await auth.protect(); // 認証必須
    if (!userId) return;

    /* ここで env が読めているか確認 */
    console.log('SECRET_KEY length', process.env.CLERK_SECRET_KEY?.length || 0);

    const client = await clerkClient();   // ← env がないとここから内部で失敗
    const user = await client.users.getUser(userId);
    console.log('privateMetadata', user.privateMetadata);

    const meta = user.privateMetadata as PrivateUsersMetadata;
    const flags = meta.users ?? {};
    const shouldLogout = flags.is_banned === true || flags.is_deleted === true;

    if (shouldLogout) {
      /* --- 現セッションが判明していれば revoke --- */
      if (sessionId) {
        await client.sessions.revokeSession(sessionId);
      }
      /* セッションが取れない場合は revoke せずリダイレクトのみ */
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

/* -------- 適用パス設定 -------- */
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
