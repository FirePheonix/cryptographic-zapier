import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { templates } from "@/lib/templates";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TemplateCard } from "./template-card";

export const metadata: Metadata = {
  title: "Explore Templates - Veriflow",
  description: "Discover workflow templates to get started quickly",
};

const ExplorePage = async () => {
  const profile = await currentUserProfile();
  const user = await currentUser();

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  if (!profile.onboardedAt) {
    return redirect("/welcome");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Explore Templates</h1>
            </div>
          </header>

          {/* Search */}
          <div className="px-6 py-4 border-b">
            <input
              type="search"
              placeholder="Search templates"
              className="w-full max-w-md px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ExplorePage;
