import { redirect } from "next/navigation";
import { currentUser, currentUserProfile } from "@/lib/auth";
import { database } from "@/lib/database";
import { profile as profileTable } from "@/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WelcomePage = async () => {
  const user = await currentUser();
  const profile = await currentUserProfile();

  if (!user) {
    return redirect("/auth/login");
  }

  // If already onboarded, redirect to workflows
  if (profile?.onboardedAt) {
    return redirect("/workflows");
  }

  // Create profile if it doesn't exist and mark as onboarded
  if (user.id) {
    await database
      .insert(profileTable)
      .values({
        id: user.id,
        onboardedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profileTable.id,
        set: {
          onboardedAt: new Date(),
        },
      });
  }

  // Redirect to workflows after onboarding
  return redirect("/workflows");
};

export default WelcomePage;


