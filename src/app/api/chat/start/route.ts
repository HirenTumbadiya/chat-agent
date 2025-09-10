import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chat = await prisma.chatSession.create({
    data: {
      userId: session.user.id,
      title: "New chat",
    },
    select: { id: true, createdAt: true, title: true },
  });

  return NextResponse.json(chat);
}


