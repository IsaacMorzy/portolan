import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthFrame } from "@/components/landing/auth-frame";

export const metadata: Metadata = { title: "Sign in — Cartograph" };

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
