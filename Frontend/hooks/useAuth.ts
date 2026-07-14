import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/api/auth/profile/");

        setIsAuthenticated(true);
        setUser(response.data.user);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  const logout = async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      router.push("/auth/login");
    }
  };

  return { isAuthenticated, user, logout };
};
