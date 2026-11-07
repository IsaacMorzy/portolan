import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthFrame } from "@/components/landing/auth-frame";

export const metadata: Metadata = {
  title: "Sign in — Cartograph",
  // Long enough to be a description rather than a restated title; the audit in
  // scripts/e2e/audit.mjs fails a page whose description is under 60 characters.
  description:
    "Sign in to Cartograph to map a public repository, follow a dependency chain, and see what a change would break.",
};

export default function SignInPage() {
  return (
    <AuthFrame
      title="Sign in to the workspace you already share."
      body="Your analyses, maps and explanations live inside one organization. Signing in puts you back in front of them."
    >
      <SignIn />
    </AuthFrame>
  );
}
