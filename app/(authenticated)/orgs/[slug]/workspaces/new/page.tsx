import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getOrganizationBySlug } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceForm } from "./create-workspace-form";

interface NewWorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewWorkspacePageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Create Workspace - ${slug} - Zynthex`,
    description: "Create a new collaborative workspace",
  };
}

export default async function NewWorkspacePage({ params }: NewWorkspacePageProps) {
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

  // Check if user can create workspaces
  if (org.userRole !== "owner" && org.userRole !== "reviewer") {
    return redirect(`/orgs/${slug}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}`}>
              <ArrowLeftIcon className="size-4 mr-2" />
              Back to Organization
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Create Workspace</h1>
            <p className="text-muted-foreground mt-1">
              Create a new workspace to collaborate on workflows with your team.
            </p>
          </div>

          <CreateWorkspaceForm organizationId={org.id} slug={slug} />
        </div>
      </div>
    </div>
  );
}
