'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alchemy, Network, OwnedNft } from 'alchemy-sdk';
import Loading from './Loading';
import Image from 'next/image';

const contractAddress = process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT!;
const blockchainRpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
const blockchainScanUrl = process.env.NEXT_PUBLIC_SCAN_URL!;
const networkChainId = process.env.NEXT_PUBLIC_CHAIN_ID!;
const networkName = process.env.NEXT_PUBLIC_NETWORK_NAME!;
const currencyName = process.env.NEXT_PUBLIC_CURRENCY_NAME!;
const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL!;
const currencyDecimals = parseInt(process.env.NEXT_PUBLIC_CURRENCY_DECIMALS!);
const membershipCollectionName = process.env.NEXT_PUBLIC_MEMBERSHIP_COLLECTION_NAME!;

const alchemyNetwork = process.env.NEXT_PUBLIC_ALCHEMY_NETWORK as keyof typeof Network;
const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
  network: Network[alchemyNetwork],
};
const alchemy = new Alchemy(settings);

const WalletConnector = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenIds, setTokenIds] = useState<string[]>([]);
  const [displayedTokenIds, setDisplayedTokenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsPerLoad = 10;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        await checkNetwork();
        await fetchNftOwnership(accounts[0]);
      } catch (err) {
        console.error(err);
        setError("ウォレット接続に失敗しました");
      }
    } else {
      setError("Web3ウォレットがインストールされていません");
    }
  };

  const checkNetwork = async () => {
    const networkId = await window.ethereum.request({ method: 'eth_chainId' });
    if (networkId !== networkChainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkChainId }],
        });
      } catch (switchError) {
        if ((switchError as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: networkChainId,
                chainName: networkName,
                nativeCurrency: {
                  name: currencyName,
                  symbol: currencySymbol,
                  decimals: currencyDecimals,
                },
                rpcUrls: [blockchainRpcUrl],
                blockExplorerUrls: [blockchainScanUrl],
              },
            ],
          });
        } else {
          setError("ネットワーク切り替えに失敗しました");
        }
      }
    }
  };

  const fetchNftOwnership = async (userAddress: string) => {
    try {
      const nfts = await alchemy.nft.getNftsForOwner(userAddress, {
        contractAddresses: [contractAddress],
      });

      if (nfts.ownedNfts && nfts.ownedNfts.length > 0) {
        const ids = nfts.ownedNfts.map((nft: OwnedNft) => nft.tokenId);
        setTokenIds(ids);
        setDisplayedTokenIds(ids.slice(0, itemsPerLoad));
      } else {
        setError("NFTを保有していません");
      }
    } catch (err) {
      console.error(err);
      setError("NFT取得に失敗しました");
    }
  };

  const loadMoreItems = useCallback(() => {
    if (loading || displayedTokenIds.length >= tokenIds.length) return;

    setLoading(true);
    setTimeout(() => {
      const nextTokenIds = tokenIds.slice(displayedTokenIds.length, displayedTokenIds.length + itemsPerLoad);
      setDisplayedTokenIds((prevIds) => [...prevIds, ...nextTokenIds]);
      setLoading(false);
    }, 1000);
  }, [loading, displayedTokenIds, tokenIds]);

  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;
  
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreItems();
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );
  
    observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [loadMoreItems]);
  

  const generateImageUrl = (tokenId: string) => {
    return `/image/spmc/cert_${tokenId}.png`;
  };
  

  return (
    <div className="mt-4">
      <div className="flex justify-center">
        <button onClick={connectWallet} className="bg-blue-500 text-white p-2 rounded">
          {account ? `Connected: ${account}` : "ウォレットを接続してNFTを持っているか確認しましょう"}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-center mt-4">
          {error === "NFTを保有していません" ? (
            <a
              href={`https://opensea.io/collection/${membershipCollectionName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              NFTを保有していません。
            </a>
          ) : (
            error
          )}
        </p>
      )}

      {displayedTokenIds.length > 0 &&
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {displayedTokenIds.map((tokenId) => (
            <div key={tokenId} className="nft-card">
              <div className="nft-card-inner">
                <div className="nft-card-front">
                  <Image
                    src={generateImageUrl(tokenId)}
                    alt={`NFT ${tokenId}`}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="nft-card-back">
                  <a
                    href={`https://opensea.io/assets/${currencyName.toLowerCase()}/${contractAddress}/${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-3xl font-bold text-white-500 underline"
                  >
                    #{tokenId}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
      {loading && <Loading />}
      <div ref={loadMoreRef} style={{ height: '1px' }} />
    </div>
  );
};

export default WalletConnector;
