import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "kd-install-dismissed";

/**
 * Android/Chrome fires `beforeinstallprompt` on qualifying visits; we hold it
 * and offer a branded "Add to home screen" bar instead of losing the chance.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-lg border border-accent/40 bg-card/95 p-3 shadow-lux backdrop-blur md:left-auto md:right-4 md:max-w-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Add KROKO DILE to your home screen</p>
        <p className="truncate text-xs text-muted-foreground">Faster shopping, order tracking and QR verification.</p>
      </div>
      <Button
        size="sm"
        className="bg-gold-gradient text-accent-foreground"
        onClick={() => {
          void deferred.prompt().then(() => deferred.userChoice.finally(dismiss));
        }}
      >
        <Download className="mr-1.5 size-4" /> Install
      </Button>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
