import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Send, Save } from "lucide-react";
import {
  getEmailSettings,
  saveSmtpSettings,
  saveEmailTemplate,
  sendTestEmail,
} from "@/lib/email-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/kingdanstore/email")({
  component: AdminEmail,
});

type Template = { key: string; label: string; subject: string; body: string; enabled: boolean };

const TOKENS = [
  "{{site_name}}",
  "{{customer_name}}",
  "{{order_code}}",
  "{{total}}",
  "{{status}}",
  "{{payment_status}}",
  "{{items}}",
  "{{courier}}",
  "{{tracking_ref}}",
  "{{track_url}}",
  "{{pay_url}}",
  "{{support_email}}",
  "{{support_phone}}",
];

function AdminEmail() {
  const load = useServerFn(getEmailSettings);
  const saveSmtp = useServerFn(saveSmtpSettings);
  const saveTpl = useServerFn(saveEmailTemplate);
  const sendTest = useServerFn(sendTestEmail);

  const { data, refetch } = useQuery({ queryKey: ["admin", "email"], queryFn: () => load({ data: undefined }) });

  const [smtp, setSmtp] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
    enabled: true,
  });
  const [passwordSet, setPasswordSet] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.smtp) {
      setSmtp((s) => ({ ...s, ...data.smtp, password: "" }));
      setPasswordSet(data.smtp.passwordSet);
    }
    setTemplates((data.templates ?? []) as Template[]);
  }, [data]);

  const persistSmtp = async () => {
    setBusy(true);
    try {
      await saveSmtp({ data: smtp });
      toast.success("SMTP settings saved");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const persistTemplate = async (t: Template) => {
    try {
      await saveTpl({ data: { key: t.key, subject: t.subject, body: t.body, enabled: t.enabled } });
      toast.success(`${t.label} saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const runTest = async () => {
    if (!testTo.trim()) {
      toast.error("Enter an email address to test with.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendTest({ data: { to: testTo.trim() } });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Email &amp; SMTP</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the SMTP details from your hosting cPanel. Port 465 = SSL, port 587 = STARTTLS — both handshakes are
          handled automatically.
        </p>
      </div>

      <section className="rounded-sm border border-border p-5">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Mail className="size-5 text-accent" /> Mail server
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Host</Label>
            <Input
              placeholder="mail.yourdomain.co.ke"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Port</Label>
              <Input
                type="number"
                value={smtp.port}
                onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) || 587 })}
              />
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Switch
                checked={smtp.secure}
                onCheckedChange={(v) => setSmtp({ ...smtp, secure: v, port: v ? 465 : 587 })}
              />
              <span className="text-xs text-muted-foreground">SSL (465)</span>
            </div>
          </div>
          <div>
            <Label>Username</Label>
            <Input
              placeholder="orders@yourdomain.co.ke"
              value={smtp.username}
              onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
            />
          </div>
          <div>
            <Label>Password {passwordSet && <span className="text-muted-foreground">(saved — leave blank to keep)</span>}</Label>
            <Input
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
            />
          </div>
          <div>
            <Label>From name</Label>
            <Input value={smtp.fromName} onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })} />
          </div>
          <div>
            <Label>From email</Label>
            <Input value={smtp.fromEmail} onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })} />
          </div>
          <div>
            <Label>Reply-to</Label>
            <Input value={smtp.replyTo} onChange={(e) => setSmtp({ ...smtp, replyTo: e.target.value })} />
          </div>
          <div className="flex items-end gap-3 pb-2">
            <Switch checked={smtp.enabled} onCheckedChange={(v) => setSmtp({ ...smtp, enabled: v })} />
            <span className="text-xs text-muted-foreground">Send customer emails</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button className="bg-gold-gradient text-accent-foreground" disabled={busy} onClick={() => void persistSmtp()}>
            <Save className="mr-2 size-4" /> Save settings
          </Button>
          <Input
            className="max-w-xs"
            placeholder="you@example.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <Button variant="outline" disabled={busy} onClick={() => void runTest()}>
            <Send className="mr-2 size-4" /> Send test
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl">Notification templates</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Placeholders: {TOKENS.join("  ")}
          </p>
        </div>

        {templates.map((t, idx) => (
          <div key={t.key} className="rounded-sm border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-xl">{t.label}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{t.key}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={t.enabled}
                  onCheckedChange={(v) =>
                    setTemplates(templates.map((x, i) => (i === idx ? { ...x, enabled: v } : x)))
                  }
                />
                <Button size="sm" variant="outline" onClick={() => void persistTemplate(t)}>
                  Save
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <Input
                value={t.subject}
                onChange={(e) => setTemplates(templates.map((x, i) => (i === idx ? { ...x, subject: e.target.value } : x)))}
              />
              <Textarea
                rows={7}
                value={t.body}
                onChange={(e) => setTemplates(templates.map((x, i) => (i === idx ? { ...x, body: e.target.value } : x)))}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
