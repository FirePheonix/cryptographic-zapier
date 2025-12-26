"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { createOrganization } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { handleError } from "@/lib/error/handle";
import { initializeOrgOnChain } from "@/lib/solana/blockchain-actions";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug if not manually edited
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating || !name.trim() || !slug.trim()) return;

    setIsCreating(true);
    try {
      // Step 1: Create in database first
      const result = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Step 2: Try to register on blockchain (non-blocking, optional)
      try {
        await initializeOrgOnChain(slug.trim());
      } catch (blockchainError) {
        console.log("Blockchain registration skipped:", blockchainError);
        // Continue anyway - blockchain is optional
      }

      router.push(`/orgs/${result.data?.slug}`);
    } catch (error) {
      handleError("Error creating organization", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orgs">
              <ArrowLeftIcon className="size-4 mr-2" />
              Back to Organizations
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Create Organization</h1>
            <p className="text-muted-foreground mt-1">
              Create a new organization to collaborate with your team on workflows.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Team"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/orgs/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-team"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be used in URLs and cannot be changed later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this organization work on?"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !name.trim() || !slug.trim()}
              >
                {isCreating ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
