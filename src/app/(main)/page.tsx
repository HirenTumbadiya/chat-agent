import { ChatDashboard } from "@/components/chat/chat-dashboard";
import { createClient } from "@/utils/supabase/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default async function Home() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const appUser = session
        ? {
            id: session.user.id,
            email: session.user.email ?? "",
            name: (() => {
                const u = session.user as unknown as SupabaseUser;
                const username = u.user_metadata && typeof u.user_metadata["username"] === "string" ? String(u.user_metadata["username"]) : undefined;
                const name = u.user_metadata && typeof u.user_metadata["name"] === "string" ? String(u.user_metadata["name"]) : undefined;
                return username ?? name ?? (session.user.email ?? "");
            })()
          }
        : null;
    return (
        <ChatDashboard user={appUser} />
    );
}