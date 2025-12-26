import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, SettingsIcon } from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getUserOrganizations, getOrganization } from "@/app/actions/organization";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeleteOrgButton } from "./delete-org-button";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Settings - ${slug} - Veriflow`,
    description: `Organization settings for ${slug}`,
  };
}

export default async function OrgSettingsPage({ params }: SettingsPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  // Find org by slug
  const orgsResult = await getUserOrganizations();
  if (!orgsResult.success || !orgsResult.data) {
    return notFound();
  }

  const org = orgsResult.data.find((o: { slug: string }) => o.slug === slug);
  if (!org) {
    return notFound();
  }

  const orgResult = await getOrganization(org.id);
  if (!orgResult.success || !orgResult.data) {
    return notFound();
  }

  const orgData = orgResult.data;

  // Only owners can access settings
  if (orgData.userRole !== "owner") {
    return redirect(`/orgs/${slug}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center gap-4 px-6 py-4 border-b">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/orgs/${slug}`}>
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SettingsIcon className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Organization Settings</h1>
                <p className="text-sm text-muted-foreground">@{orgData.slug}</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>General</CardTitle>
                  <CardDescription>
                    Basic information about your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Organization Name</label>
                    <p className="text-sm text-muted-foreground mt-1">{orgData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">URL Slug</label>
                    <p className="text-sm text-muted-foreground mt-1">@{orgData.slug}</p>
                  </div>
                  {orgData.description && (
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <p className="text-sm text-muted-foreground mt-1">{orgData.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                    <div>
                      <h4 className="font-medium">Delete this organization</h4>
                      <p className="text-sm text-muted-foreground">
                        Once deleted, this organization and all its workspaces will be permanently removed.
                      </p>
                    </div>
                    <DeleteOrgButton orgId={org.id} orgName={orgData.name} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
