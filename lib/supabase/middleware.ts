import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth"];

/** Refreshes the Supabase session cookie and sends logged-out visitors to /login. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // Owner only: if OWNER_EMAIL is set in Vercel, any other signed-in account is signed out.
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (user && owner && user.email?.toLowerCase() !== owner) {
    await supabase.auth.signOut();
    const redirect = redirectTo("/login");
    request.cookies.getAll().forEach((c) => {
      if (c.name.startsWith("sb-")) redirect.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    });
    return redirect;
  }

  if (!user && !isPublic) return redirectTo("/login");
  if (user && path === "/login") return redirectTo("/");

  return response;
}
