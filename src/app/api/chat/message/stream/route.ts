import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { sessionId?: string; content?: string } | null;
  if (!body?.sessionId || !body?.content) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!process.env.OPEN_AI_API_KEY) {
    return NextResponse.json({ error: "OPEN_AI_API_KEY not set" }, { status: 500 });
  }

  // Persist user message first
  await prisma.chatMessage.create({
    data: {
      sessionId: body.sessionId,
      senderId: session.user.id,
      role: "user",
      content: body.content,
    },
  });

  // Load history for context
  const history = await prisma.chatMessage.findMany({
    where: { sessionId: body.sessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
    take: 40,
  });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: "You are an AI career counselor. Provide actionable, empathetic guidance with clear next steps." },
    ...history.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY! });
      let full = "";
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          stream: true,
        });

        for await (const chunk of completion) {
          const delta = chunk?.choices?.[0]?.delta?.content ?? "";
          if (!delta) continue;
          full += delta;
          const payload = `data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        // Persist assistant message when finished
        const assistant = await prisma.chatMessage.create({
          data: {
            sessionId: body.sessionId!,
            senderId: session.user.id,
            role: "assistant",
            content: full,
          },
          select: { id: true },
        });

        // Auto-title if needed
        const sessionRow = await prisma.chatSession.findUnique({ where: { id: body.sessionId! }, select: { title: true } });
        if (sessionRow && (!sessionRow.title || sessionRow.title === "New chat")) {
          const firstUser = history.find((m) => m.role === "user");
          const seed = firstUser?.content ?? body.content ?? "";
          const candidate = seed
            .split(/\s+/)
            .slice(0, 8)
            .join(" ")
            .replace(/\s+/g, " ");
          const title = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          await prisma.chatSession.update({ where: { id: body.sessionId! }, data: { title } });
        }

        const done = `data: ${JSON.stringify({ type: "done", id: assistant.id })}\n\n`;
        controller.enqueue(encoder.encode(done));
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


