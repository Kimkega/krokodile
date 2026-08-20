import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — KROKO DILE" },
      { name: "description", content: "Sign in to manage the KROKO DILE store, orders and M-Pesa settings." },
      { property: "og:title", content: "Admin Sign In — KROKO DILE" },
      { property: "og:description", content: "Staff access to the KROKO DILE admin dashboard." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/kingdanstore" });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-4xl">Staff sign in</h1>
        <form onSubmit={signIn} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="a-email">Email</Label>
            <Input id="a-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="a-pass">Password</Label>
            <Input
              id="a-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-gradient text-accent-foreground shadow-gold hover:opacity-90"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </SiteShell>
  );
}
