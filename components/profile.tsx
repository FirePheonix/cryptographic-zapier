import type { UserAttributes } from "@supabase/supabase-js";
import { Loader2Icon } from "lucide-react";
import { type FormEventHandler, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { handleError } from "@/lib/error/handle";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type ProfileProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const Profile = ({ open, setOpen }: ProfileProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const client = createClient();
      const { data } = await client.auth.getUser();

      if (!data.user) {
        return;
      }

      if (data.user.user_metadata.name) {
        setName(data.user.user_metadata.name);
      }

      if (data.user.email) {
        setEmail(data.user.email);
      }
    };

    loadProfile();
  }, []);

  const handleUpdateUser: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!(name.trim() && email.trim()) || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const client = createClient();

      const attributes: UserAttributes = {
        data: {},
      };

      if (name.trim()) {
        attributes.data = {
          ...attributes.data,
          name,
        };
      }

      if (email.trim()) {
        attributes.email = email;
      }

      if (password.trim()) {
        attributes.password = password;
      }

      const response = await client.auth.updateUser(attributes);

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("Profile updated successfully");
      setOpen(false);
    } catch (error) {
      handleError("Error updating profile", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog modal={false} onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Update your profile information.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-disabled={isUpdating}
          className="grid gap-4"
          onSubmit={handleUpdateUser}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              className="text-foreground"
              id="name"
              onChange={({ target }) => setName(target.value)}
              placeholder="Jane Doe"
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              className="text-foreground"
              id="email"
              onChange={({ target }) => setEmail(target.value)}
              placeholder="jane@doe.com"
              type="email"
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              className="text-foreground"
              id="password"
              onChange={({ target }) => setPassword(target.value)}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          </div>
          <Button
            disabled={isUpdating || !name.trim() || !email.trim()}
            type="submit"
          >
            Update
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};


