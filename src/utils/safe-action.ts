import "server-only";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createSafeActionClient } from "next-safe-action";

export const actionClient = createSafeActionClient({
  throwValidationErrors: true,
  handleServerError: (error) => {
    console.log({ error: JSON.stringify(error) });
    return error.message;
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  return next({ ctx: { user } });
});

export const adminActionClient = authActionClient.use(async ({ next, ctx }) => {
  const { user } = ctx;

  if (user.role !== "ADMIN") throw new Error("Unauthorized");

  return next({ ctx: { user } });
});
