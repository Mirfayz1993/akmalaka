import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Foydalanuvchi nomi", type: "text" },
        password: { label: "Parol", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) return null;

        const adminUsername = process.env.ADMIN_USERNAME;
        const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64;
        const adminPasswordHash = hashB64
          ? Buffer.from(hashB64, "base64").toString("utf8")
          : undefined;

        if (!adminUsername || !adminPasswordHash) {
          console.error("ADMIN_USERNAME yoki ADMIN_PASSWORD_HASH_B64 sozlanmagan");
          return null;
        }

        if (username !== adminUsername) return null;

        const isValid = await bcrypt.compare(password, adminPasswordHash);
        if (!isValid) return null;

        return { id: "1", name: adminUsername, email: `${adminUsername}@wood-erp.local` };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 soat
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname === "/login";

      if (isOnLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
});
