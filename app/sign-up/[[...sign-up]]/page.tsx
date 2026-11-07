import { SignUp } from "@clerk/nextjs";
import { AuthFrame } from "@/components/landing/auth-frame";

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
