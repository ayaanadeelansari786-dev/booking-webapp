import type { Business } from "@/lib/types";

export const demoBusiness: Business = {
  id: "demo-service-co",
  name: "Demo Service Co.",
  logo_url: null
};

export function businessFallback(id: string): Business {
  return {
    id,
    name: id
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Service Business",
    logo_url: null
  };
}
