import { NextRequest, NextResponse } from 'next/server';
import {
  fetchOwnedNftTokenIds,
  getNftOwnershipConfig,
  NFT_OWNER_ADDRESS_PATTERN,
} from '@/lib/nft-ownership';
import type { OwnedNftsResponse } from '@/types/nft';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('owner');
  if (!owner || !NFT_OWNER_ADDRESS_PATTERN.test(owner)) {
    return NextResponse.json({ error: 'ウォレットアドレスが不正です' }, { status: 400 });
  }

  const config = getNftOwnershipConfig(owner);
  if (!config) {
    return NextResponse.json({ error: 'NFT取得を利用できません' }, { status: 503 });
  }

  try {
    const tokenIds = await fetchOwnedNftTokenIds(config);
    return NextResponse.json<OwnedNftsResponse>(
      { tokenIds },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    // Upstream errors may contain the API key from the request URL.
    return NextResponse.json({ error: 'NFT取得に失敗しました' }, { status: 502 });
  }
}
