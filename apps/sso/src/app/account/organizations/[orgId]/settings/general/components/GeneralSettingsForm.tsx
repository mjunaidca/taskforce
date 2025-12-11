"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlugInput } from "@/components/organizations/SlugInput";
import { toast } from "@/lib/utils/toast";
import type { Organization } from "@/types/organization";

interface GeneralSettingsFormProps {
  organization: Organization;
}

export function GeneralSettingsForm({ organization }: GeneralSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo || "",
    metadata: organization.metadata || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement with Better Auth organization.update()
      // await authClient.organization.update({
      //   organizationId: organization.id,
      //   name: formData.name,
      //   slug: formData.slug,
      //   logo: formData.logo,
      //   metadata: formData.metadata,
      // });

      toast.success("Organization updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Failed to update organization:", error);
      toast.error("Failed to update organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
          Organization Name
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="AI Lab"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-2">
          Organization Slug
        </label>
        <SlugInput
          value={formData.slug}
          onChange={(value) => setFormData({ ...formData, slug: value })}
          helperText="Changing your slug will redirect the old slug for 30 days"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
