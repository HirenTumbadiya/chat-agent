import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export type Context = {
  userId: string | null;
  prisma: typeof prisma;
};

export async function createContext(): Promise<Context> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return {
    userId: session?.user?.id ?? null,
    prisma,
  };
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});


