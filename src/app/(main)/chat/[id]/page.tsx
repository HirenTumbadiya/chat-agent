import { createClient } from "@/utils/supabase/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";

type Props = {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const appUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: (() => {
      const u = session.user as unknown as SupabaseUser;
      const username = u.user_metadata && typeof u.user_metadata["username"] === "string" ? String(u.user_metadata["username"]) : undefined;
      const name = u.user_metadata && typeof u.user_metadata["name"] === "string" ? String(u.user_metadata["name"]) : undefined;
      return username ?? name ?? (session.user.email ?? "");
    })()
  };

  return (
    <ChatInterface chatId={id} user={appUser} />
  );
}


