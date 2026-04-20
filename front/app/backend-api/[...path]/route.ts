import { NextRequest } from "next/server";

const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL ?? "http://localhost:8081";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const backendUrl = buildBackendUrl(path, request.nextUrl.search);
  const headers = buildForwardHeaders(request, path);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store"
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: buildResponseHeaders(response)
    });
  } catch {
    return Response.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "Backend не отвечает по адресу интеграции."
      },
      { status: 502 }
    );
  }
}

function buildBackendUrl(path: string[], search: string) {
  const normalizedBase = backendApiBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.join("/");
  return `${normalizedBase}/${normalizedPath}${search}`;
}

function buildForwardHeaders(request: NextRequest, path: string[]) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("sec-fetch-dest");
  headers.delete("sec-fetch-mode");
  headers.delete("sec-fetch-site");
  headers.delete("sec-ch-ua");
  headers.delete("sec-ch-ua-mobile");
  headers.delete("sec-ch-ua-platform");
  if (isAuthEndpoint(path)) {
    headers.delete("authorization");
  }
  return headers;
}

function isAuthEndpoint(path: string[]) {
  const normalizedPath = path.join("/");
  return normalizedPath === "api/auth/login" || normalizedPath === "api/auth/register";
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return headers;
}
