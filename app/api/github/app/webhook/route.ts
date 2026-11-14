// Pass-through for GitHub App webhook deliveries sent to /api/github/app/webhook.
// Delegates to app/api/github/webhook/route.ts, which verifies the HMAC-SHA256
// signature (resolveOrganization-equivalent for sessionless webhook entry points)
// before acting on any pull request event.
import { POST } from "@/app/api/github/webhook/route.ts";

export { POST };
