import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// The progress view asks this instead of subscribing to a channel: the browser
// has no token PostgREST will accept, and the secret key can never cross the
// wire. Scoped to the caller's organization, so an id from somewhere else
// reads as nothing.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return new NextResponse(null, { status: 401 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("analyses")
    .select("status, stage, stage_message, error")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return new NextResponse(null, { status: 404 });

  return NextResponse.json(
    {
      status: data.status,
      stage: data.stage,
      message: data.status === "failed" ? data.error : data.stage_message,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
