import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { MongoStore } from "connect-mongo";
import { storage } from "./storage";
import connectSanitizer from "connect-mongo";

const MongoStore = connectSanitizer.default || connectSanitizer;

// REPLIT_DOMAINS is optional for local development

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
    );
  },
  { maxAge: 3600 * 1000 },
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const mongoUrl =
    "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/";

  return session({
    secret: process.env.SESSION_SECRET!,
    store: MongoStore.create({
      mongoUrl,
      dbName: "meritcurve",
      collectionName: "sessions",
      ttl: sessionTtl / 1000, // TTL in seconds
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

async function verify(
  issuer: client.IssuerMetadata,
  tokens: { userinfo?: any },
): Promise<any> {
  const user = {
    id: tokens.userinfo?.sub || "unknown",
    email: tokens.userinfo?.email,
    firstName: tokens.userinfo?.given_name,
    lastName: tokens.userinfo?.family_name,
    profileImageUrl: tokens.userinfo?.picture,
    role: "student",
  };

  await storage.upsertUser(user);
  return { user, claims: tokens.userinfo };
}

export async function setupAuth(app: Express) {
  const sessionMiddleware = getSession();
  app.use(sessionMiddleware);

  const oidcConfig = await getOidcConfig();

  passport.use("oidc", new Strategy({ config: oidcConfig }, verify));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get("/api/login", passport.authenticate("oidc"));

  app.get(
    "/api/callback",
    passport.authenticate("oidc", {
      successRedirect: "/",
      failureRedirect: "/login?error=auth_failed",
    }),
  );

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
