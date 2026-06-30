"use client";

import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    document.cookie = "owner_access_token=; path=/; max-age=0; samesite=lax";
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      Sign out
    </button>
  );
}
