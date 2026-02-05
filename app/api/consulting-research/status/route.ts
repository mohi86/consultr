import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";
const VALYU_APP_URL = process.env.VALYU_APP_URL || "https://platform.valyu.ai";

interface StatusResponse {
  status?: string;
  deepresearch_id?: string;
  output?: string | Record<string, unknown>;
  sources?: Array<{ title?: string; url?: string }>;
  usage?: Record<string, unknown>;
  pdf_url?: string;
  deliverables?: Array<{ type?: string; title?: string; url?: string; status?: string }>;
  progress?: { current_step?: number; total_steps?: number };
  error?: string;
}

const getValyuApiKey = () => {
  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    throw new Error("VALYU_API_KEY environment variable is required");
  }
  return apiKey;
};

async function getStatusViaProxy(
  taskId: string,
  accessToken: string
): Promise<StatusResponse> {
  const proxyUrl = `${VALYU_APP_URL}/api/oauth/proxy`;

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: `/v1/deepresearch/tasks/${taskId}/status`,
      method: "GET",
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { error: "Session expired. Please sign in again." };
    }
    return { error: `API call failed: ${response.status}` };
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const accessToken = searchParams.get("accessToken");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    let statusData: StatusResponse;

    // Use OAuth proxy in valyu mode with token
    if (APP_MODE === "valyu" && accessToken) {
      statusData = await getStatusViaProxy(taskId, accessToken);
      if (statusData.error) {
        return NextResponse.json({ error: statusData.error }, { status: 500 });
      }
    } else if (APP_MODE === "self-hosted" || !accessToken) {
      // Self-hosted mode or no token: use API key directly
      const valyu = new Valyu(getValyuApiKey());
      const sdkResponse = await valyu.deepresearch.status(taskId);
      statusData = sdkResponse as unknown as StatusResponse;
    } else {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: statusData.status,
      task_id: statusData.deepresearch_id || taskId,
      output: statusData.output,
      sources: statusData.sources,
      usage: statusData.usage,
      pdf_url: statusData.pdf_url,
      deliverables: statusData.deliverables,
      progress: statusData.progress,
      error: statusData.error,
    });
  } catch (error) {
    console.error("Error getting research status:", error);

    const message =
      error instanceof Error ? error.message : "Failed to get research status";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
