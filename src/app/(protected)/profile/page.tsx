import { ProfileSettings } from "@/components/profile/profile-settings";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  const profile = await prisma.profile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      isPublic: true,
    },
  });

  return (
    <ProfileSettings
      email={user.email}
      initialProfile={{
        displayName: user.displayName ?? "",
        bio: profile?.bio ?? "",
        avatarUrl: profile?.avatarUrl ?? "",
        bannerUrl: profile?.bannerUrl ?? "",
        isPublic: profile?.isPublic ?? false,
      }}
    />
  );
}
