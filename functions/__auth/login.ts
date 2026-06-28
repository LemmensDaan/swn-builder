export const onRequest: PagesFunction = async (context) => {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await context.request.json() as { password: string };
    const correctPassword = context.env.AUTH_PASSWORD as string;

    if (!correctPassword) {
      return new Response('Authentication not configured', { status: 500 });
    }

    if (body.password === correctPassword) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response('Invalid request', { status: 400 });
  }
};
