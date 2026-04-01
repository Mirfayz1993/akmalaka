import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isHealthCheck = req.nextUrl.pathname === "/api/health";

  // Auth API va health check ni himoyalamayiz
  if (isApiAuth || isHealthCheck) return;

  // Login sahifasiga kirish — login bo'lsa asosiy sahifaga yuboramiz
  if (isLoginPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    return;
  }

  // Boshqa barcha routelar uchun login tekshirish
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
