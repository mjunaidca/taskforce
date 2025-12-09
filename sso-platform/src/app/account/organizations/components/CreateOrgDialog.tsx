"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SlugInput } from "@/components/organizations/SlugInput";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/utils/toast";
import { useRouter } from "next/navigation";
import { sanitizeSlug } from "@/lib/utils/validation";

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  logo: z.instanceof(FileList).optional(),
});

type OrgFormData = z.infer<typeof orgSchema>;

export function CreateOrgDialog() {
  const [open, setOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
  });

  const name = watch("name");
  const slug = watch("slug");

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (!slug || slug === sanitizeSlug(name || "")) {
      setValue("slug", sanitizeSlug(newName));
    }
  };

  // Handle logo preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo must be less than 2MB");
        e.target.value = "";
        return;
      }

      // Validate file type
      if (!["image/png", "image/jpeg", "image/jpg", "image/gif"].includes(file.type)) {
        toast.error("Logo must be PNG, JPG, or GIF");
        e.target.value = "";
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const onSubmit = async (data: OrgFormData) => {
    try {
      let logoBase64: string | undefined;

      // Convert logo to base64 if uploaded
      if (data.logo && data.logo[0]) {
        const file = data.logo[0];
        const reader = new FileReader();
        logoBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Create organization
      const result = await authClient.organization.create({
        name: data.name,
        slug: data.slug,
        logo: logoBase64,
        metadata: data.description
          ? { description: data.description }
          : undefined,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to create organization");
        return;
      }

      // Auto-switch to new organization
      if (result.data?.id) {
        await authClient.organization.setActive({
          organizationId: result.data.id,
        });
      }

      toast.success(`Organization "${data.name}" created successfully!`);
      setOpen(false);
      reset();
      setLogoPreview(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error("Failed to create organization. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-gradient-to-r from-taskflow-500 to-taskflow-600">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              onChange={(e) => {
                register("name").onChange(e);
                handleNameChange(e);
              }}
              placeholder="Acme Inc"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Organization Slug <span className="text-red-500">*</span>
            </Label>
            <SlugInput
              value={watch("slug")}
              onChange={(value) => setValue("slug", value)}
              error={errors.slug?.message}
              autoGenerateFrom={watch("name")}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="A brief description of your organization"
              rows={3}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label htmlFor="logo">Organization Logo (optional)</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="flex-shrink-0">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  {...register("logo")}
                  onChange={(e) => {
                    register("logo").onChange(e);
                    handleLogoChange(e);
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, or GIF. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
                setLogoPreview(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
