import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * L5 — Agent surface: MCP over the stored graph.
 *
 * HTTP+JSON-RPC MCP server. Two tools:
 *   graph_imports  — what files import a given file (incoming edges)
 *   graph_imported_by — what a file imports (outgoing edges)
 *
 * Scoped like every other entry point: the caller's organization must own
 * the analysis, otherwise 404. Queries are filtered by organization_id so a
 * workspace never sees another workspace's graph.
 *
 * No @modelcontextprotocol/sdk dependency — MCP over HTTP is just JSON-RPC.
 * The protocol version pinned is 2025-03-26.
 */

export const dynamic = "force-dynamic";

const MCP_VERSION = "2025-03-26";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string };
  id: string | number;
};

const tools = {
  graph_imports: {
    description:
      "Returns the distinct files that import (have an outgoing edge to) the given file within this analysis.",
    inputSchema: {
      type: "object",
      properties: {
        analysisId: { type: "string", description: "Analysis ID (UUID)" },
        filePath: { type: "string", description: "Repository-relative file path" },
      },
      required: ["analysisId", "filePath"],
    },
  },
  graph_imported_by: {
    description:
      "Returns the distinct files that are imported by (have an incoming edge from) the given file within this analysis.",
    inputSchema: {
      type: "object",
      properties: {
        analysisId: { type: "string", description: "Analysis ID (UUID)" },
        filePath: { type: "string", description: "Repository-relative file path" },
      },
      required: ["analysisId", "filePath"],
    },
  },
};

function toolList() {
  return {
    tools: Object.entries(tools).map(([name, def]) => ({
      name,
      description: def.description,
      inputSchema: def.inputSchema,
    })),
  };
}

async function handleToolCall(
  db: ReturnType<typeof createServerSupabase>,
  orgId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { analysisId, filePath } = args;
  if (!analysisId || typeof analysisId !== "string") {
    throw new Error("analysisId is required");
  }
  if (!filePath || typeof filePath !== "string") {
    throw new Error("filePath is required");
  }

  // Verify the analysis belongs to this org and is complete.
  const { data: analysis, error: analysisError } = await db
    .from("analyses")
    .select("id, status, organization_id")
    .eq("id", analysisId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (analysisError) throw new Error(analysisError.message);
  if (!analysis || analysis.status !== "complete") {
    throw new Error("Analysis not found");
  }

  // Load edges for this analysis, scoped by organization.
  const { data: edges, error: edgesError } = await db
    .from("edges")
    .select("source_file_id, target_file_id, kind, specifier, line")
    .eq("analysis_id", analysisId);
  if (edgesError) throw new Error(edgesError.message);

  // Load file paths for this analysis.
  const { data: files, error: filesError } = await db
    .from("files")
    .select("id, path")
    .eq("analysis_id", analysisId);
  if (filesError) throw new Error(filesError.message);

  const idToPath = new Map(files.map((f) => [f.id, f.path]));
  const pathToId = new Map(files.map((f) => [f.path, f.id]));

  if (name === "graph_imports") {
    // Files that import filePath: edges where target_file_id = filePath's id
    const targetId = pathToId.get(filePath);
    if (!targetId) return { imports: [] };
    const importers = edges
      .filter((e) => e.target_file_id === targetId)
      .map((e) => idToPath.get(e.source_file_id))
      .filter(Boolean);
    return { imports: importers };
  }

  if (name === "graph_imported_by") {
    // Files that filePath imports: edges where source_file_id = filePath's id
    const sourceId = pathToId.get(filePath);
    if (!sourceId) return { importedBy: [] };
    const imported = edges
      .filter((e) => e.source_file_id === sourceId)
      .map((e) => idToPath.get(e.target_file_id))
      .filter(Boolean);
    return { importedBy: imported };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function jsonRpcError(id: string | number, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function jsonRpcResult(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export async function POST(request: Request): Promise<Response> {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 401 });
  }

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const { method, params, id } = body;

  if (method === "initialize") {
    return NextResponse.json(jsonRpcResult(id, {
      protocolVersion: MCP_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "portolan-graph", version: "1.0.0" },
    }));
  }

  if (method === "tools/list") {
    return NextResponse.json(jsonRpcResult(id, toolList()));
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args: Record<string, unknown> = {};
    if (params?.arguments) {
      Object.assign(args, params?.arguments);
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        jsonRpcError(id, -32602, "Invalid params: name is required"),
        { status: 400 },
      );
    }

    const db = await createServerSupabase();
    try {
      const result = await handleToolCall(db, orgId, name, args);
      return NextResponse.json(jsonRpcResult(id, result));
    } catch (error) {
      return NextResponse.json(
        jsonRpcError(id, -32603, error instanceof Error ? error.message : String(error)),
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    jsonRpcError(id, -32601, `Method not found: ${method}`),
    { status: 404 },
  );
}

export async function GET() {
  return NextResponse.json({
    jsonrpc: "2.0",
    id: null,
    error: { code: -32600, message: "Invalid Request: use POST" },
  });
}