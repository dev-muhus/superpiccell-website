import { db } from '@/db';
import { posts, users, likes, bookmarks, post_media } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { deleteMedia } from '@/utils/media-utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// URLからメディアタイプを判定するヘルパー関数
function determineMediaTypeFromUrl(url: string, defaultType: string): 'image' | 'video' {
  // URLに基づいてメディアタイプを判定
  if (url.match(/\.(jpe?g|png|gif|webp)$/i) || url.includes('/image/')) {
    return 'image';
  } else if (url.match(/\.(mp4|webm|mov)$/i) || url.includes('/videos/')) {
    return 'video';
  }
  
  // デフォルトのmedia_typeが'image'または'video'の場合はそれを使用
  if (defaultType === 'image' || defaultType === 'video') {
    return defaultType as 'image' | 'video';
  }
  
  // どちらでもない場合はURLの構造から判定
  return url.includes('cloudinary') && !url.includes('/video/') ? 'image' : 'video';
}

// 特定の投稿を取得するAPI
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Clerk認証からユーザーIDを取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }
    
    const postId = parseInt(params.id);
    
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: "無効な投稿IDです" },
        { status: 400 }
      );
    }

    // URLパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const includeRelated = searchParams.get('include_related') === 'true'; // 関連データを含めるかどうか

    // データベースからユーザー情報を取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }
    
    // 投稿データを取得
    const [post] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.is_deleted, false)
      ))
      .limit(1);
    
    if (!post) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }
    
    // 投稿者の情報を取得
    const [postUser] = await db.select({
      id: users.id,
      username: users.username,
      profile_image_url: users.profile_image_url,
      first_name: users.first_name,
      last_name: users.last_name
    })
    .from(users)
    .where(eq(users.id, post.user_id))
    .limit(1);
    
    // 関連投稿情報を取得（include_relatedがtrueの場合のみ）
    let replyToPost = null;
    let quotePost = null;
    let repostOfPost = null;
    
    if (includeRelated) {
      // 返信先の投稿情報を取得（もし返信の場合）
      if (post.post_type === 'reply' && post.in_reply_to_post_id) {
        const [replyToPostData] = await db.select()
          .from(posts)
          .where(and(
            eq(posts.id, post.in_reply_to_post_id),
            eq(posts.is_deleted, false)
          ))
          .limit(1);
        
        if (replyToPostData) {
          const [replyToPostUser] = await db.select({
            id: users.id,
            username: users.username,
            profile_image_url: users.profile_image_url,
            first_name: users.first_name,
            last_name: users.last_name
          })
          .from(users)
          .where(eq(users.id, replyToPostData.user_id))
          .limit(1);
          
          // 返信先投稿のメディア情報を取得
          const replyMediaItems = await db.select()
            .from(post_media)
            .where(and(
              eq(post_media.post_id, replyToPostData.id),
              eq(post_media.is_deleted, false)
            ));
          
          // メディア情報を整形
          const replyMedia = replyMediaItems.map(item => {
            return {
              ...item,
              mediaType: determineMediaTypeFromUrl(item.url, item.media_type)
            };
          });
          
          replyToPost = {
            ...replyToPostData,
            user: replyToPostUser,
            media: replyMedia.length > 0 ? replyMedia : undefined
          };
        }
      }
      
      // 引用元の投稿情報を取得（もし引用投稿の場合）
      if (post.post_type === 'quote' && post.quote_of_post_id) {
        const [quotePostData] = await db.select()
          .from(posts)
          .where(and(
            eq(posts.id, post.quote_of_post_id),
            eq(posts.is_deleted, false)
          ))
          .limit(1);
        
        if (quotePostData) {
          const [quotePostUser] = await db.select({
            id: users.id,
            username: users.username,
            profile_image_url: users.profile_image_url,
            first_name: users.first_name,
            last_name: users.last_name
          })
          .from(users)
          .where(eq(users.id, quotePostData.user_id))
          .limit(1);
          
          // 引用元投稿のメディア情報を取得
          const quoteMediaItems = await db.select()
            .from(post_media)
            .where(and(
              eq(post_media.post_id, quotePostData.id),
              eq(post_media.is_deleted, false)
            ));
          
          // メディア情報を整形
          const quoteMedia = quoteMediaItems.map(item => {
            return {
              ...item,
              mediaType: determineMediaTypeFromUrl(item.url, item.media_type)
            };
          });
          
          quotePost = {
            ...quotePostData,
            user: quotePostUser,
            media: quoteMedia.length > 0 ? quoteMedia : undefined
          };
        }
      }
      
      // リポスト元の投稿情報を取得（もしリポストの場合）
      if (post.post_type === 'repost' && post.repost_of_post_id) {
        const [repostOfPostData] = await db.select()
          .from(posts)
          .where(and(
            eq(posts.id, post.repost_of_post_id),
            eq(posts.is_deleted, false)
          ))
          .limit(1);
        
        if (repostOfPostData) {
          const [repostOfPostUser] = await db.select({
            id: users.id,
            username: users.username,
            profile_image_url: users.profile_image_url,
            first_name: users.first_name,
            last_name: users.last_name
          })
          .from(users)
          .where(eq(users.id, repostOfPostData.user_id))
          .limit(1);
          
          // リポスト元投稿のメディア情報を取得
          const repostMediaItems = await db.select()
            .from(post_media)
            .where(and(
              eq(post_media.post_id, repostOfPostData.id),
              eq(post_media.is_deleted, false)
            ));
          
          // メディア情報を整形
          const repostMedia = repostMediaItems.map(item => {
            return {
              ...item,
              mediaType: determineMediaTypeFromUrl(item.url, item.media_type)
            };
          });
          
          // リポスト元投稿のエンゲージメント情報を取得
          // 返信数
          const repostRepliesCount = await db.select({
            count: count()
          })
          .from(posts)
          .where(and(
            eq(posts.in_reply_to_post_id, repostOfPostData.id),
            eq(posts.post_type, 'reply'),
            eq(posts.is_deleted, false)
          ));
          
          // いいね数
          const repostLikesCount = await db.select({
            count: count()
          })
          .from(likes)
          .where(and(
            eq(likes.post_id, repostOfPostData.id),
            eq(likes.is_deleted, false)
          ));
          
          // ユーザーのいいね状態
          const [repostUserLike] = await db.select()
            .from(likes)
            .where(and(
              eq(likes.user_id, dbUser.id),
              eq(likes.post_id, repostOfPostData.id),
              eq(likes.is_deleted, false)
            ))
            .limit(1);
          
          // ブックマーク数
          const repostBookmarksCount = await db.select({
            count: count()
          })
          .from(bookmarks)
          .where(and(
            eq(bookmarks.post_id, repostOfPostData.id),
            eq(bookmarks.is_deleted, false)
          ));
          
          // ユーザーのブックマーク状態
          const [repostUserBookmark] = await db.select()
            .from(bookmarks)
            .where(and(
              eq(bookmarks.user_id, dbUser.id),
              eq(bookmarks.post_id, repostOfPostData.id),
              eq(bookmarks.is_deleted, false)
            ))
            .limit(1);
          
          repostOfPost = {
            ...repostOfPostData,
            user: repostOfPostUser,
            media: repostMedia.length > 0 ? repostMedia : undefined,
            reply_count: repostRepliesCount[0]?.count || 0,
            like_count: repostLikesCount[0]?.count || 0,
            is_liked: !!repostUserLike,
            bookmark_count: repostBookmarksCount[0]?.count || 0,
            is_bookmarked: !!repostUserBookmark
          };
        }
      }
    }
    
    // 返信数を取得
    const repliesCount = await db.select({
      count: count()
    })
    .from(posts)
    .where(and(
      eq(posts.in_reply_to_post_id, post.id),
      eq(posts.post_type, 'reply'),
      eq(posts.is_deleted, false)
    ));
    
    const reply_count = repliesCount[0]?.count || 0;
    
    // いいね数を取得
    const likesCount = await db.select({
      count: count()
    })
    .from(likes)
    .where(and(
      eq(likes.post_id, post.id),
      eq(likes.is_deleted, false)
    ));
    
    const like_count = likesCount[0]?.count || 0;
    
    // ユーザーのいいね状態を取得
    const [userLike] = await db.select()
      .from(likes)
      .where(and(
        eq(likes.user_id, dbUser.id),
        eq(likes.post_id, post.id),
        eq(likes.is_deleted, false)
      ))
      .limit(1);
    
    // ブックマーク数を取得
    const bookmarksCount = await db.select({
      count: count()
    })
    .from(bookmarks)
    .where(and(
      eq(bookmarks.post_id, post.id),
      eq(bookmarks.is_deleted, false)
    ));
    
    const bookmark_count = bookmarksCount[0]?.count || 0;
    
    // ユーザーのブックマーク状態を取得
    const [userBookmark] = await db.select()
      .from(bookmarks)
      .where(and(
        eq(bookmarks.user_id, dbUser.id),
        eq(bookmarks.post_id, post.id),
        eq(bookmarks.is_deleted, false)
      ))
      .limit(1);
    
    // メディア情報を取得
    interface MediaItem {
      id: number;
      post_id: number;
      media_type: string;
      url: string;
      width: number | null;
      height: number | null;
      duration_sec: number | null;
      is_deleted: boolean;
      created_at: Date;
      mediaType: 'image' | 'video';
    }

    const media: MediaItem[] = [];
    if (post.media_count && post.media_count > 0) {
      const mediaItems = await db.select()
        .from(post_media)
        .where(and(
          eq(post_media.post_id, post.id),
          eq(post_media.is_deleted, false)
        ));
      
      if (mediaItems && mediaItems.length > 0) {
        // mediaItems配列を加工して必要なプロパティを追加
        mediaItems.forEach(item => {
          media.push({
            ...item,
            // URL情報からメディアタイプを判定して追加
            mediaType: determineMediaTypeFromUrl(item.url, item.media_type)
          });
        });
      }
    }
    
    // リポスト数を取得
    const repostCount = await db.select({
      count: count()
    })
    .from(posts)
    .where(and(
      eq(posts.post_type, 'repost'),
      eq(posts.repost_of_post_id, post.id),
      eq(posts.is_deleted, false)
    ));
    
    const repost_count = repostCount[0]?.count || 0;
    
    // ユーザーのリポスト状態を取得
    const [userRepost] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.user_id, dbUser.id),
        eq(posts.post_type, 'repost'),
        eq(posts.repost_of_post_id, post.id),
        eq(posts.is_deleted, false)
      ))
      .limit(1);
    
    // この投稿に対するリポスト情報を取得（自分とフォローしているユーザー）
    const repostInfo = await db.select({
      id: posts.id,
      user_id: posts.user_id,
      created_at: posts.created_at,
      username: users.username,
      profile_image_url: users.profile_image_url
    })
    .from(posts)
    .innerJoin(users, eq(posts.user_id, users.id))
    .where(and(
      eq(posts.post_type, 'repost'),
      eq(posts.repost_of_post_id, post.id),
      eq(posts.is_deleted, false),
      eq(users.is_deleted, false),
      eq(users.is_banned, false),
      // 自分または（将来的に）フォローしているユーザーのリポストのみ
      eq(posts.user_id, dbUser.id) // 現在は自分のリポストのみ
    ))
    .orderBy(desc(posts.created_at))
    .limit(1); // 最新のリポストのみ取得
    
    // レスポンスデータを構築
    const postWithDetails = {
      ...post,
      user: postUser,
      ...(includeRelated && {
        in_reply_to_post: replyToPost,
        quote_of_post: quotePost,
        repost_of_post: repostOfPost,
      }),
      reply_count: reply_count,
      like_count: like_count,
      is_liked: !!userLike,
      repost_count: repost_count,
      is_reposted: !!userRepost,
      bookmark_count: bookmark_count,
      is_bookmarked: !!userBookmark,
      media: media.length > 0 ? media : undefined,
      // リポスト情報を追加
      reposted_by: repostInfo.length > 0 ? {
        id: repostInfo[0].id,
        user_id: repostInfo[0].user_id,
        username: repostInfo[0].username,
        profile_image_url: repostInfo[0].profile_image_url,
        created_at: repostInfo[0].created_at
      } : null
    };
    
    return NextResponse.json({
      post: postWithDetails
    });
    
  } catch (error) {
    console.error('投稿詳細取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 投稿を削除するAPI（is_deletedフラグを使用した論理削除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }
    
    const postId = parseInt(params.id);
    
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: "無効な投稿IDです" },
        { status: 400 }
      );
    }
    
    // データベースからユーザー情報を取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }
    
    // 投稿を取得して所有者か確認
    const [post] = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (!post) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }
    
    // 投稿が既に削除済みかどうかを確認
    if (post.is_deleted) {
      return NextResponse.json(
        { error: "投稿は既に削除されています" },
        { status: 404 }
      );
    }
    
    // 投稿の所有者でない場合はエラー
    if (post.user_id !== dbUser.id) {
      return NextResponse.json(
        { error: "この投稿を削除する権限がありません" },
        { status: 403 }
      );
    }

    // 削除するメディアを取得
    const mediaToDelete = await db.select()
      .from(post_media)
      .where(and(
        eq(post_media.post_id, postId),
        eq(post_media.is_deleted, false)
      ));
    
    // トランザクションで投稿と関連メディアを論理削除
    await db.transaction(async (tx) => {
      // 投稿を論理削除
      await tx.update(posts)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(posts.id, postId));
      
      // 関連するメディアも論理削除
      await tx.update(post_media)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(post_media.post_id, postId));
    });

    // ストレージからメディアファイルを削除
    // 注意: ここでのファイル削除は、他の投稿で同じファイルが使用されていないことが前提
    // 本来は参照カウントなどの仕組みが必要だが、このサンプル実装では簡略化
    if (mediaToDelete.length > 0) {
      const deletePromises = mediaToDelete.map(media => 
        deleteMedia(media.url, media.media_type as 'image' | 'video')
      );
      await Promise.allSettled(deletePromises);
    }
    
    return NextResponse.json({
      success: true,
      message: "投稿が削除されました"
    });
    
  } catch (error) {
    console.error('投稿削除中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 