import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthFrame } from "@/components/landing/auth-frame";

export const metadata: Metadata = { title: "Create an account — Cartograph" };

export default function SignUpPage() {
  return (
    <AuthFrame
      title="Map your first repository."
      body="One account covers every workspace you join. Point Cartograph at a public repository and it comes back with the map in about a minute."
    >
      <SignUp />
    </AuthFrame>
  );
}
