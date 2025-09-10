import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

export const messageRouter = router({
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.string(), cursor: z.string().nullish(), limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const { sessionId, limit } = input;
      const cursor = input.cursor ?? undefined;
      const items = await ctx.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        select: { id: true, role: true, content: true, createdAt: true },
      });
      let nextCursor: string | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }
      return { items, nextCursor };
    }),

  send: protectedProcedure
    .input(z.object({ sessionId: z.string(), content: z.string().min(1) }))
    .mutation( async ({ ctx, input }) => {
      if (!process.env.OPEN_AI_API_KEY) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OPEN_AI_API_KEY is not set on the server" });
      }

      // Ensure the auth user exists for FK
      await ctx.prisma.user.upsert({
        where: { id: ctx.userId! },
        update: {},
        create: { id: ctx.userId! },
      });

      // Persist the user's message first
      const userMsg = await ctx.prisma.chatMessage.create({
        data: { sessionId: input.sessionId, senderId: ctx.userId!, role: "user", content: input.content },
        select: { id: true }
      });

      // Load recent conversation for context (cap to 20 last messages for token safety)
      const history = await ctx.prisma.chatMessage.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
        take: 40,
      });

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: "You are an AI career counselor. Provide actionable, empathetic guidance with clear next steps." },
        ...history.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      ];

      let assistant = "";
      try {
        const res = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
        });
        assistant = res.choices?.[0]?.message?.content ?? "";
      } catch (err: unknown) {
        const e = err as { status?: number; response?: { status?: number }; message?: unknown };
        const status = e?.status ?? e?.response?.status;
        const message = typeof e?.message === "string" ? e.message : "AI provider error";
        if (status === 401) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid OpenAI API key" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }

      const assistantMsg = await ctx.prisma.chatMessage.create({
        data: { sessionId: input.sessionId, senderId: ctx.userId!, role: "assistant", content: assistant },
        select: { id: true, content: true }
      });

      // Auto-title session if it still has default title
      const session = await ctx.prisma.chatSession.findUnique({ where: { id: input.sessionId }, select: { title: true } });
      if (session && (!session.title || session.title === "New chat")) {
        const firstUser = history.find((m) => m.role === "user");
        const seed = firstUser?.content ?? input.content;
        const candidate = seed
          .split(/\s+/)
          .slice(0, 8)
          .join(" ")
          .replace(/\s+/g, " ");
        const title = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        await ctx.prisma.chatSession.update({ where: { id: input.sessionId }, data: { title } });
      }

      return { userId: userMsg.id, assistant: assistantMsg };
    })
});


