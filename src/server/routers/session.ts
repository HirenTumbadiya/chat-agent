import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const sessionRouter = router({
  list: protectedProcedure
    .input(z.object({ cursor: z.string().nullish(), limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;
      const cursor = input?.cursor ?? undefined;
      const sessions = await ctx.prisma.chatSession.findMany({
        where: { userId: ctx.userId! },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        select: { id: true, title: true, createdAt: true },
      });
      let nextCursor: string | undefined = undefined;
      if (sessions.length > limit) {
        const nextItem = sessions.pop();
        nextCursor = nextItem!.id;
      }
      return { items: sessions, nextCursor };
    }),

  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Ensure the auth user exists in the mapped users table to satisfy FK
      await ctx.prisma.user.upsert({
        where: { id: ctx.userId! },
        update: {},
        create: { id: ctx.userId! },
      });

      const chat = await ctx.prisma.chatSession.create({
        data: { userId: ctx.userId!, title: "New chat" },
        select: { id: true, title: true, createdAt: true },
      });
      return chat;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.chatSession.update({ where: { id: input.id, }, data: { title: input.title } });
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure the session belongs to the current user
      const session = await ctx.prisma.chatSession.findFirst({ where: { id: input.id, userId: ctx.userId! }, select: { id: true } });
      if (!session) {
        return { ok: false };
      }
      await ctx.prisma.chatSession.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});


