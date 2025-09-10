import { router } from "../trpc";
import { sessionRouter } from "./session";
import { messageRouter } from "./message";

export const appRouter = router({
  session: sessionRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;


