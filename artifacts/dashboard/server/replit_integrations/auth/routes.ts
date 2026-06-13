import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const claims = req.user;
      const userId = claims.uid as string;

      let user = await authStorage.getUser(userId);
      if (!user) {
        const nameParts = (claims.name as string | undefined)?.split(' ') ?? [];
        user = await authStorage.upsertUser({
          id:              userId,
          email:           (claims.email as string | undefined) ?? null,
          firstName:       nameParts[0] ?? null,
          lastName:        nameParts.slice(1).join(' ') || null,
          profileImageUrl: (claims.picture as string | undefined) ?? null,
        });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
