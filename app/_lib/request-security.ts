export async function readJsonBody<T>(request: Request, maxBytes: number) {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim();
  if (contentType !== 'application/json') {
    return {
      response: Response.json(
        { error: 'Content-Type must be application/json.' },
        { status: 415, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      response: Response.json(
        { error: 'Request body is too large.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > maxBytes) {
      return {
        response: Response.json(
          { error: 'Request body is too large.' },
          { status: 413, headers: { 'Cache-Control': 'no-store' } }
        ),
      };
    }
    return { data: JSON.parse(new TextDecoder().decode(bytes)) as T };
  } catch {
    return {
      response: Response.json(
        { error: 'A valid JSON request body is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const expectedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin) {
    return Response.json(
      { error: 'Cross-origin request denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return null;
}

export async function boundedRequest(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      response: Response.json(
        { error: 'Request body is too large.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    return {
      response: Response.json(
        { error: 'Request body is too large.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }
  return { request: new Request(request, { body: bytes }) };
}
