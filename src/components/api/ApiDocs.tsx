import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  curl: string;
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/forms",
    description: "List all forms in the workspace",
    curl: `curl -H "X-API-Key: YOUR_API_KEY" \\
  https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/forms`,
    response: `{
  "data": [
    {
      "id": "uuid",
      "title": "Contact Form",
      "mode": "standard",
      "status": "active",
      "submission_count": 42,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 1 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/forms/:id",
    description: "Get a single form by ID",
    curl: `curl -H "X-API-Key: YOUR_API_KEY" \\
  https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/forms/FORM_ID`,
    response: `{
  "data": {
    "id": "uuid",
    "title": "Contact Form",
    "description": "...",
    "mode": "standard",
    "status": "active",
    "fields": [...],
    "settings": {...},
    "submission_count": 42,
    "created_at": "2026-01-01T00:00:00Z"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/submissions?form_id=X",
    description: "List submissions for a form",
    curl: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/submissions?form_id=FORM_ID&page=1&per_page=25"`,
    response: `{
  "data": [
    {
      "id": "uuid",
      "form_id": "uuid",
      "data": { "name": "John", "email": "john@example.com" },
      "submitted_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 42 }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/submissions",
    description: "Create a new submission",
    curl: `curl -X POST -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"form_id": "FORM_ID", "data": {"name": "John"}}' \\
  https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/submissions`,
    response: `{
  "data": {
    "id": "uuid",
    "form_id": "uuid",
    "data": { "name": "John" },
    "submitted_at": "2026-01-01T00:00:00Z"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/waitlist?form_id=X",
    description: "List waitlist entries for a form",
    curl: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/waitlist?form_id=FORM_ID"`,
    response: `{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane",
      "position": 1,
      "referral_code": "abc12345",
      "referral_count": 3,
      "status": "waiting",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 100 }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/waitlist",
    description: "Add an entry to a waitlist",
    curl: `curl -X POST -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"form_id": "FORM_ID", "email": "user@example.com", "name": "Jane"}' \\
  https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/waitlist`,
    response: `{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane",
    "position": 101,
    "referral_code": "xyz98765",
    "created_at": "2026-01-01T00:00:00Z"
  }
}`,
  },
];

function methodColor(method: string): string {
  return method === "GET"
    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
    : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400";
}

export default function ApiDocs() {
  const { t } = useTranslation();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleCopy(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Clipboard not available
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {t("api.documentation")}
        </CardTitle>
        <CardDescription>{t("api.docsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth section */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">{t("api.authentication")}</p>
          <p className="text-sm text-muted-foreground">{t("api.authDescription")}</p>
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto border" dir="ltr">
            X-API-Key: ff_your_api_key_here
          </pre>
        </div>

        {/* Rate limiting */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">{t("api.rateLimit")}</p>
          <p className="text-sm text-muted-foreground">{t("api.rateLimitDescription")}</p>
        </div>

        {/* Endpoints */}
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("api.endpoints")}</p>
          {ENDPOINTS.map((endpoint, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-muted/30">
                <Badge variant="secondary" className={cn("text-xs font-mono", methodColor(endpoint.method))}>
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono" dir="ltr">{endpoint.path}</code>
                <span className="text-xs text-muted-foreground flex-1">{endpoint.description}</span>
              </div>
              <div className="p-3">
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="h-8">
                    <TabsTrigger value="curl" className="text-xs h-7">cURL</TabsTrigger>
                    <TabsTrigger value="response" className="text-xs h-7">{t("api.response")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-2">
                    <div className="relative">
                      <pre className="text-xs bg-muted rounded p-3 overflow-x-auto border" dir="ltr">
                        {endpoint.curl}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 ltr:right-1 rtl:left-1 h-7 w-7"
                        onClick={() => handleCopy(endpoint.curl, idx)}
                      >
                        {copiedIdx === idx ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="response" className="mt-2">
                    <pre className="text-xs bg-muted rounded p-3 overflow-x-auto border max-h-48" dir="ltr">
                      {endpoint.response}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ))}
        </div>

        {/* Error format */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">{t("api.errorFormat")}</p>
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto border" dir="ltr">
{`{
  "error": {
    "code": "not_found",
    "message": "Form not found"
  }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
