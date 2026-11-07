import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthFrame } from "@/components/landing/auth-frame";

export const metadata: Metadata = {
  title: "Create an account — Portolan",
  // Long enough to be a description rather than a restated title; the audit in
  // scripts/e2e/audit.mjs fails a page whose description is under 60 characters.
  description:
    "Create a Portolan account to map a public GitHub repository and see every resolved import, edge and change risk.",
};

export default function SignUpPage() {
  return (
    <AuthFrame
      title="Map your first repository."
      body="One account covers every workspace you join. Point Portolan at a public repository and it comes back with the map in about a minute."
    >
      <SignUp />
    </AuthFrame>
  );
}
