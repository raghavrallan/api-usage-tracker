import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAuthPage = pathname.startsWith("/login");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api/");

  if (isApiAuth) return;

  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", req.url));
    }
    return;
  }

  if (!isLoggedIn && !isApi) {
    return Response.redirect(new URL("/login", req.url));
  }

  if (!isLoggedIn && isApi) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  if (isApi && pathname.startsWith("/api/admin") && role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
