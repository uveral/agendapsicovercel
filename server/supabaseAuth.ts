import type { Express, Request, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import type { UpsertUser } from "@shared/schema";
import { storage } from "./storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL must be defined for Supabase auth");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be defined for Supabase auth");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type Role = "admin" | "therapist" | "client";

type AuthUser = {
  id: string;
  role: Role;
  therapistId: string | null;
  email: string | null;
  claims: { sub: string };
};

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthUser;
    user?: AuthUser;
    supabaseAccessToken?: string;
  }
}

function parseCookies(header?: string | string[]): Record<string, string> {
  if (!header) {
    return {};
  }

  const cookieHeader = Array.isArray(header) ? header.join(";") : header;

  return cookieHeader
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const [rawKey, ...rawValue] = part.split("=");
      if (!rawKey) {
        return acc;
      }

      const key = rawKey.trim();
      const value = rawValue.join("=");
      acc[key] = decodeURIComponent(value || "");
      return acc;
    }, {});
}

function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookies = parseCookies(req.headers["cookie"]);
  if (cookies["sb-access-token"]) {
    return cookies["sb-access-token"];
  }

  return null;
}

async function ensureUserProfile(supabaseUser: {
  id: string;
  email: string | null;
  user_metadata: Record<string, any>;
}) {
  const metadata = supabaseUser.user_metadata ?? {};
  const firstName = metadata.first_name ?? metadata.firstName ?? null;
  const lastName = metadata.last_name ?? metadata.lastName ?? null;
  const profileImageUrl = metadata.avatar_url ?? metadata.profile_image_url ?? metadata.picture ?? null;

  const existingUser = await storage.getUser(supabaseUser.id);

  const upsertPayload: UpsertUser = {
    id: supabaseUser.id,
    email: supabaseUser.email ?? existingUser?.email ?? null,
    firstName: firstName ?? existingUser?.firstName ?? null,
    lastName: lastName ?? existingUser?.lastName ?? null,
    profileImageUrl: profileImageUrl ?? existingUser?.profileImageUrl ?? null,
    therapistId: existingUser?.therapistId ?? null,
    role: existingUser?.role ?? "client",
  };

  const userRecord = await storage.upsertUser(upsertPayload);
  return userRecord;
}

export async function setupAuth(app: Express) {
  app.get("/api/login", (_req, res) => {
    res.status(501).json({ message: "Supabase Auth is handled via the frontend" });
  });

  app.get("/api/logout", (_req, res) => {
    res.status(200).json({ message: "Supabase Auth logout should be handled client-side" });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = extractAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !data?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRecord = await ensureUserProfile({
      id: data.user.id,
      email: data.user.email ?? null,
      user_metadata: data.user.user_metadata ?? {},
    });

    const authUser: AuthUser = {
      id: userRecord.id,
      role: userRecord.role as Role,
      therapistId: userRecord.therapistId ?? null,
      email: userRecord.email ?? null,
      claims: { sub: userRecord.id },
    };

    req.user = authUser;
    req.authUser = authUser;
    req.supabaseAccessToken = accessToken;

    return next();
  } catch (error) {
    console.error("Error validating Supabase auth token", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);

  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  req.user = {
    id: user.id,
    role: user.role as Role,
    therapistId: user.therapistId ?? null,
    email: user.email ?? null,
    claims: { sub: user.id },
  };

  return next();
};
