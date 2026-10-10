"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BytePlusLogo } from "@/components/brand/byteplus-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage, http } from "@/lib/api/http";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await http.post("/auth", { code });
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center">
      <Card className="w-full">
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <BytePlusLogo className="mb-1 h-7" />
              <h1 className="text-lg font-semibold tracking-tight">Seed Audio Studio</h1>
              <p className="text-sm text-muted-foreground">Enter the access code to continue.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-code">Access code</Label>
              <Input id="access-code" type="password" autoComplete="current-password" autoFocus value={code} onChange={(event) => setCode(event.target.value)} aria-invalid={Boolean(error)} />
              {error ? (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={!code || pending}>
              {pending ? "Checking..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
