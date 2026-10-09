import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/layout/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
