'use client';

import { SplashScreen } from '@/components/SplashScreen';
import { AppShell } from '@/components/layout/AppShell';
import { PageIntro } from '@/components/layout/PageIntro';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useAuth } from '@/context/AuthContext';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';

export default function ProfilePage() {
  const { session } = useAuth();
  const { config: appConfig } = usePublicSitePageConfig('app');
  const profileConfig = appConfig.profile;

  if (session === undefined) {
    return <SplashScreen />;
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell puckDocumentKey="profile">
      <PageIntro
        eyebrow={profileConfig.pageEyebrow}
        title={profileConfig.pageTitle}
        description={profileConfig.pageDescription}
      />
      <ProfileForm />
    </AppShell>
  );
}
