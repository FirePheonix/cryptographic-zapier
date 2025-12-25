"use client";

import {
  CompassIcon,
  FolderIcon,
  LayoutGridIcon,
  TagIcon,
  WorkflowIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  workflowCount?: number;
}

export function AppSidebar({ workflowCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();

  const mainNavItems = [
    {
      title: "Flows",
      url: "/workflows",
      icon: WorkflowIcon,
      isActive: pathname === "/workflows",
    },
    {
      title: "Explore",
      url: "/explore",
      icon: CompassIcon,
      isActive: pathname === "/explore",
    },
  ];

  const folderItems = [
    {
      title: "All flows",
      url: "/workflows",
      icon: LayoutGridIcon,
      count: workflowCount,
      isActive: pathname === "/workflows",
    },
    {
      title: "Uncategorized",
      url: "/workflows?folder=uncategorized",
      icon: TagIcon,
      count: workflowCount,
      isActive: pathname.includes("uncategorized"),
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link href="/workflows" className="flex items-center gap-2 px-2 py-1">
          <Image
            src="/logo.png"
            alt="Veriflow"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
            Veriflow
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {pathname.startsWith("/workflows") && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Folders</span>
              <FolderIcon className="size-4 opacity-50" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {folderItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.count !== undefined && (
                      <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
