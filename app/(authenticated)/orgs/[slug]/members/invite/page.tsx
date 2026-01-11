import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, UserPlusIcon } from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getOrganizationBySlug } from "@/app/actions/organization";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { InviteMemberForm } from "./invite-form";

interface InviteMemberPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: InviteMemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Invite Member - ${slug} - Zynthex`,
    description: "Invite a new member to your organization",
  };
}

export default async function InviteMemberPage({ params }: InviteMemberPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  const result = await getOrganizationBySlug(slug);
  if (!result.success || !result.data) {
    return notFound();
  }

  const org = result.data;

  // Only owners can invite
  if (org.userRole !== "owner") {
    return redirect(`/orgs/${slug}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/orgs/${slug}`}>
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlusIcon className="size-5" />
                  Invite Member
                </h1>
                <p className="text-sm text-muted-foreground">
                  Invite someone to join {org.name}
                </p>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-md mx-auto">
              <InviteMemberForm organizationId={org.id} slug={slug} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
