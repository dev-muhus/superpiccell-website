import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/nfts/owned/route';
import { NFT_REQUEST_TIMEOUT_MS } from '@/lib/nft-ownership';

const OWNER = '0x1234567890123456789012345678901234567890';
const CONTRACT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const API_KEY = 'test-alchemy-key';
const originalEnv = process.env;

function createRequest(owner: string = OWNER) {
  const url = new URL('https://example.com/api/nfts/owned');
  url.searchParams.set('owner', owner);
  return new NextRequest(url);
}

describe('GET /api/nfts/owned', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ALCHEMY_API_KEY: API_KEY,
      NEXT_PUBLIC_ALCHEMY_NETWORK: 'MATIC_MAINNET',
      NEXT_PUBLIC_MEMBERSHIP_CONTRACT: CONTRACT,
      NEXT_PUBLIC_SITE_URL: 'https://superpiccell.com',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('preserves decimal IDs and normalizes hexadecimal IDs without losing precision', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      ownedNfts: [
        { tokenId: '42' },
        { tokenId: '0x002b' },
        { tokenId: '9007199254740993' },
      ],
      pageKey: 'next-page',
    }));

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tokenIds: ['42', '43', '9007199254740993'] });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.origin).toBe('https://polygon-mainnet.g.alchemy.com');
    expect(requestedUrl.pathname).toBe(`/nft/v3/${API_KEY}/getNFTsForOwner`);
    expect(requestedUrl.searchParams.get('owner')).toBe(OWNER);
    expect(requestedUrl.searchParams.getAll('contractAddresses[]')).toEqual([CONTRACT]);
    expect(requestedUrl.searchParams.get('withMetadata')).toBe('false');
    expect(requestedUrl.searchParams.get('pageSize')).toBe('100');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', redirect: 'error' });
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      Accept: 'application/json',
      Origin: 'https://superpiccell.com',
    });
  });

  test('preserves the SDK default Ethereum network when the environment omits it', async () => {
    delete process.env.NEXT_PUBLIC_ALCHEMY_NETWORK;
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ownedNfts: [] }));
    const response = await GET(createRequest());
    expect(response.status).toBe(200);
    expect(new URL(String(fetchMock.mock.calls[0][0])).origin).toBe('https://eth-mainnet.g.alchemy.com');
  });

  test('uses the configured site origin rather than a caller-supplied origin', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://superpiccell.com/membership';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ownedNfts: [] }));
    const request = new NextRequest(`https://preview.example/api/nfts/owned?owner=${OWNER}`, {
      headers: { Origin: 'https://attacker.example' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      Accept: 'application/json',
      Origin: 'https://superpiccell.com',
    });
  });

  test('uses the existing canonical site default when the site URL is omitted', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ownedNfts: [] }));
    const response = await GET(createRequest());
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Origin: 'https://superpiccell.com' });
  });

  test('returns an empty list for an owner without membership NFTs', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ownedNfts: [] }));
    const response = await GET(createRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tokenIds: [] });
  });

  test.each(['', 'not-an-address', '0x1234', `${OWNER}&contractAddresses[]=other`])(
    'rejects an invalid owner before contacting Alchemy: %s',
    async owner => {
      const fetchMock = jest.spyOn(globalThis, 'fetch');
      const response = await GET(createRequest(owner));
      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['NEXT_PUBLIC_ALCHEMY_API_KEY', ''],
    ['NEXT_PUBLIC_MEMBERSHIP_CONTRACT', 'invalid'],
    ['NEXT_PUBLIC_ALCHEMY_NETWORK', 'attacker.example/path'],
    ['NEXT_PUBLIC_ALCHEMY_NETWORK', 'constructor'],
    ['NEXT_PUBLIC_SITE_URL', 'invalid'],
    ['NEXT_PUBLIC_SITE_URL', 'file:///etc/passwd'],
    ['NEXT_PUBLIC_SITE_URL', 'https://user:password@example.com'],
  ])('rejects invalid server configuration for %s', async (name, value) => {
    process.env[name] = value;
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const response = await GET(createRequest());
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('hides upstream error responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`Unauthorized: ${API_KEY}`, { status: 401 }));
    const response = await GET(createRequest());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'NFT取得に失敗しました' });
  });

  test('hides and does not log rejected request URLs containing the API key', async () => {
    const consoleMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(`Request failed: https://example.com/${API_KEY}`));
    const response = await GET(createRequest());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(API_KEY);
    expect(consoleMock).not.toHaveBeenCalled();
  });

  test('hides malformed JSON returned by Alchemy', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`not-json: ${API_KEY}`));
    const response = await GET(createRequest());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'NFT取得に失敗しました' });
  });

  test.each([
    {},
    { ownedNfts: [{ tokenId: '../secret' }] },
    { ownedNfts: [{ tokenId: 42 }] },
    { ownedNfts: [{ tokenId: '-1' }] },
    { ownedNfts: [{ tokenId: '115792089237316195423570985008687907853269984665640564039457584007913129639936' }] },
    { ownedNfts: Array.from({ length: 101 }, () => ({ tokenId: '1' })) },
  ])('rejects malformed NFT responses: %j', async data => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(data));
    const response = await GET(createRequest());
    expect(response.status).toBe(502);
  });

  test('aborts a stalled upstream request at the timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const responsePromise = GET(createRequest());
    await jest.advanceTimersByTimeAsync(NFT_REQUEST_TIMEOUT_MS);
    const response = await responsePromise;
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'NFT取得に失敗しました' });
  });
});
