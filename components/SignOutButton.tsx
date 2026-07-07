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
      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-[#A0AEC0] transition hover:border-[#00D4FF]/40 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_18px_rgba(0,212,255,0.16)]"
    >
      Sign out
    </button>
  );
}
