import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Simple mock authentication system without Replit dependencies
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Mock login - creates or logs in as a user
  app.post("/api/login", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user
        const allUsers = await storage.getAllUsers();
        const isFirstUser = allUsers.length === 0;
        const isAdminEmail = email.includes("admin@") || email.startsWith("admin");

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await storage.upsertUser({
          id: userId,
          email,
          firstName: email.split("@")[0],
          lastName: "",
          profileImageUrl: null,
          role: (isFirstUser || isAdminEmail) ? "admin" : "client",
        });

        user = await storage.getUser(userId);
      }

      // Set session
      (req.session as any).userId = user!.id;

      res.json(user);
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request for downstream use
  (req as any).user = { claims: { sub: userId } };

  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);

  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  next();
};
