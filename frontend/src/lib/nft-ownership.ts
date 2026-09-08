export const NFT_OWNER_ADDRESS_PATTERN = /^0x[\da-fA-F]{40}$/;
export const NFT_REQUEST_TIMEOUT_MS = 10_000;

const NFT_PAGE_SIZE = 100;
const NFT_TOKEN_ID_PATTERN = /^(?:\d{1,78}|0x[\da-fA-F]{1,64})$/;
const MAX_NFT_TOKEN_ID = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

// Keep the existing Alchemy SDK network names used by the environment files.
const ALCHEMY_NFT_NETWORKS = {
  ETH_MAINNET: 'eth-mainnet',
  ETH_SEPOLIA: 'eth-sepolia',
  MATIC_MAINNET: 'polygon-mainnet',
  MATIC_AMOY: 'polygon-amoy',
  ARB_MAINNET: 'arb-mainnet',
  ARB_SEPOLIA: 'arb-sepolia',
  OPT_MAINNET: 'opt-mainnet',
  OPT_SEPOLIA: 'opt-sepolia',
  BASE_MAINNET: 'base-mainnet',
  BASE_SEPOLIA: 'base-sepolia',
} as const;

interface NftOwnershipConfig {
  url: URL;
  origin: string;
}

export function getNftOwnershipConfig(owner: string): NftOwnershipConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT;
  const network = process.env.NEXT_PUBLIC_ALCHEMY_NETWORK || 'ETH_MAINNET';
  // Match the established canonical site default in app/layout.tsx.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://superpiccell.com';

  if (
    !apiKey ||
    !contractAddress ||
    !NFT_OWNER_ADDRESS_PATTERN.test(contractAddress) ||
    !Object.prototype.hasOwnProperty.call(ALCHEMY_NFT_NETWORKS, network)
  ) {
    return null;
  }

  let origin: string;
  try {
    const site = new URL(siteUrl);
    if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password) return null;
    origin = site.origin;
  } catch {
    return null;
  }

  const hostname = ALCHEMY_NFT_NETWORKS[network as keyof typeof ALCHEMY_NFT_NETWORKS];
  const url = new URL(
    `https://${hostname}.g.alchemy.com/nft/v3/${encodeURIComponent(apiKey)}/getNFTsForOwner`
  );
  url.searchParams.set('owner', owner);
  url.searchParams.set('contractAddresses[]', contractAddress);
  url.searchParams.set('withMetadata', 'false');
  // The membership UI currently displays the first page returned by the SDK.
  url.searchParams.set('pageSize', String(NFT_PAGE_SIZE));
  return { url, origin };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTokenId(nft: unknown): string {
  if (!isRecord(nft) || typeof nft.tokenId !== 'string' || !NFT_TOKEN_ID_PATTERN.test(nft.tokenId)) {
    throw new Error('Invalid NFT response');
  }

  const tokenId = BigInt(nft.tokenId);
  if (tokenId > MAX_NFT_TOKEN_ID) throw new Error('Invalid NFT token ID');

  // Alchemy SDK returned decimal IDs; preserve local image and OpenSea URLs.
  return tokenId.toString();
}

export async function fetchOwnedNftTokenIds({ url, origin }: NftOwnershipConfig): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NFT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      // The existing Alchemy key requires an allowlisted origin. Use trusted
      // deployment configuration so preview domains and caller headers cannot alter it.
      headers: { Accept: 'application/json', Origin: origin },
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('NFT request failed');

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.ownedNfts) || data.ownedNfts.length > NFT_PAGE_SIZE) {
      throw new Error('Invalid NFT response');
    }

    return data.ownedNfts.map(normalizeTokenId);
  } finally {
    clearTimeout(timeout);
  }
}
