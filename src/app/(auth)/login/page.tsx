import { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
    title: "Login",
};

export default function Page() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Oration AI</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Your AI Career Counselor</p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}