import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  onUploaded: (path: string) => void;
  folder?: string;
  multiple?: boolean;
  label?: string;
  className?: string;
};

export function ImageUploader({
  onUploaded,
  folder = "products",
  multiple = false,
  label = "Upload image",
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw error;
        onUploaded(path);
      }
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-accent",
        className,
      )}
      onClick={() => inputRef.current?.click()}
    >
      {busy ? <Loader2 className="size-5 animate-spin text-accent" /> : <ImagePlus className="size-5 text-accent" />}
      <span>{busy ? "Uploading…" : label}</span>
      <span className="text-[10px]">Drag &amp; drop or click</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
