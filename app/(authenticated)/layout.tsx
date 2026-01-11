import { ReactFlowProvider } from "@xyflow/react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser, currentUserProfile } from "@/lib/auth";
import { PostHogIdentifyProvider } from "@/providers/posthog-provider";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

const AuthenticatedLayout = async ({ children }: AuthenticatedLayoutProps) => {
  const user = await currentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await currentUserProfile();

  if (!profile) {
    return null;
  }

  return (
    <PostHogIdentifyProvider>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </PostHogIdentifyProvider>
  );
};

export default AuthenticatedLayout;


