'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';

export default function ProfileRedirectPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push('/sign-in');
      } else if (user?.username) {
        router.push(`/profile/${user.username}`);
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <PageLayout>
      <div className="flex justify-center items-center py-12">
        <Loading message="プロフィールページに移動中..." />
        </div>
    </PageLayout>
  );
} 