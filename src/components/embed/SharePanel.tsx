import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Code, QrCode, Check, ExternalLink } from "lucide-react";

interface SharePanelProps {
  formId: string;
  formTitle: string;
}

export default function SharePanel({ formId, formTitle }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const publicUrl = `${window.location.origin}/f/${formId}`;

  const embedCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="${formTitle}"
></iframe>`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(publicUrl)}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast({ title: "Copied!", description: `${label} copied to clipboard.` });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy.", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Share Form</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="link">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Link
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1.5 text-xs">
              <Code className="h-3.5 w-3.5" /> Embed
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5 text-xs">
              <QrCode className="h-3.5 w-3.5" /> QR Code
            </TabsTrigger>
          </TabsList>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Public Link</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(publicUrl, "Link")}
                >
                  {copied === "Link" ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link to let anyone submit a response.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open(publicUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" /> Open in New Tab
            </Button>
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Embed Code</Label>
              <Textarea
                value={embedCode}
                readOnly
                className="font-mono text-xs min-h-[120px] resize-none"
              />
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => copyToClipboard(embedCode, "Embed code")}
            >
              {copied === "Embed code" ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Embed Code
            </Button>
            <p className="text-xs text-muted-foreground">
              Paste this code into your website's HTML to embed the form.
            </p>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <img
                  src={qrCodeUrl}
                  alt={`QR code for ${formTitle}`}
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code to open the form on a mobile device.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qrCodeUrl;
                  a.download = `${formTitle}-qr-code.svg`;
                  a.click();
                }}
              >
                <QrCode className="h-4 w-4" /> Download QR Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
