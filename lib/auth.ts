import { eq } from "drizzle-orm";
import { profile } from "@/schema";
import { database } from "./database";
import { createClient } from "./supabase/server";

export const currentUser = async () => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
};

export const currentUserProfile = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error("User not found");
  }

  const userProfiles = await database
    .select()
    .from(profile)
    .where(eq(profile.id, user.id));
  let userProfile = userProfiles.at(0);

  if (!userProfile && user.email) {
    const response = await database
      .insert(profile)
      .values({ id: user.id })
      .onConflictDoNothing()
      .returning();

    // If insert was skipped due to conflict, fetch the existing profile
    if (response.length) {
      userProfile = response[0];
    } else {
      const existingProfiles = await database
        .select()
        .from(profile)
        .where(eq(profile.id, user.id));
      userProfile = existingProfiles.at(0);
    }
  }

  return userProfile;
};

// Simplified auth check - no subscription required for this mini-zapier
export const getAuthenticatedUser = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error("You need to be logged in to use this feature.");
  }

  return user;
};


