
import { redirect } from "next/navigation";
import React from "react";
import { createClient } from "@/utils/supabase/server";
import SessionProvider from "./SessionProvider";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) redirect("/login");

    return (
        <SessionProvider >
            {children}
        </SessionProvider>
    );
}