import { eq } from "drizzle-orm";
import Link from "next/link";
import { currentUserProfile } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows } from "@/schema";
import { Menu } from "./menu";
import { Button } from "./ui/button";

type WorkflowTopRightProps = {
  id: string;
};

export const WorkflowTopRight = async ({ id }: WorkflowTopRightProps) => {
  const profile = await currentUserProfile();
  const workflow = await database.query.workflows.findFirst({
    where: eq(workflows.id, id),
  });

  if (!(profile && workflow)) {
    return null;
  }

  return (
    <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-3 sm:top-0 sm:left-auto">
      <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <Menu />
      </div>
    </div>
  );
};


