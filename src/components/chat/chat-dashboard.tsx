"use client"

import type React from "react"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, MessageSquare, Plus, Trash2, Menu } from "lucide-react"
// import { ChatStorage, type ChatSession } from "@/lib/chat-storage"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ChatInterface } from "./chat-interface"
import { logout } from "@/app/(auth)/action"
import { api } from "@/utils/trpc"
import * as Dialog from "@radix-ui/react-dialog"
import { Input } from "@/components/ui/input"

interface User {
    id: string
    email: string
    name: string
}

interface ChatDashboardProps {
    user: User | null
}

export function ChatDashboard({ user }: ChatDashboardProps) {
    const [activeChat, setActiveChat] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    //   const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [renameOpen, setRenameOpen] = useState(false)
    const [renameId, setRenameId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    //   const chatStorage = ChatStorage.getInstance()

    // TRPC: sessions list with cursor pagination
    const sessionsQuery = api.session.list.useInfiniteQuery(
        { limit: 10 },
        {
            getNextPageParam: (last) => last.nextCursor ?? undefined,
            refetchOnWindowFocus: false,
        }
    )

    const createSession = api.session.create.useMutation({
        onSuccess: (chat) => {
            sessionsQuery.refetch()
            setActiveChat(chat.id)
            setIsMobileMenuOpen(false)
        },
    })

    const deleteSession = api.session.delete.useMutation({
        onSuccess: () => {
            sessionsQuery.refetch()
            if (activeChat && activeChat === pendingDeleteId) setActiveChat(null)
            setPendingDeleteId(null)
            setConfirmOpen(false)
        },
    })

    const renameSession = api.session.rename.useMutation({
        onSuccess: () => {
            sessionsQuery.refetch()
            setRenameOpen(false)
            setRenameId(null)
            setRenameValue("")
        },
    })

    useEffect(() => {
        // No-op for now, TRPC handles loading sessions
    }, [user?.id])

    const handleNewChat = async () => {
        try {
            await createSession.mutateAsync()
        } catch {
            // no-op for now
        }
    }

    const handleBackToDashboard = () => {
        setActiveChat(null)
        sessionsQuery.refetch()
    }

    const handleLogout = () => {
        startTransition(async () => {
            await logout()
        })
    }

    const requestDeleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setPendingDeleteId(sessionId)
        setConfirmOpen(true)
    }

    const openRename = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setRenameId(sessionId)
        setRenameValue(currentTitle)
        setRenameOpen(true)
    }

    const confirmDelete = async () => {
        if (!pendingDeleteId) return
        await deleteSession.mutateAsync({ id: pendingDeleteId })
    }

    const confirmRename = async () => {
        if (!renameId || !renameValue.trim()) return
        await renameSession.mutateAsync({ id: renameId, title: renameValue.trim() })
    }

    const formatRelativeTime = (date: Date) => {
        const now = new Date()
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

        if (diffInHours < 1) {
            return "Just now"
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`
        } else if (diffInHours < 48) {
            return "Yesterday"
        } else {
            return date.toLocaleDateString()
        }
    }

    if (activeChat) {
        return <ChatInterface chatId={activeChat} user={user as User} onBack={handleBackToDashboard} />
    }

    const MobileUserMenu = () => (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden cursor-pointer">
                    <Menu className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 pt-6">
                    <div className="flex items-center space-x-3 pb-4 border-b">
                        <Avatar>
                            <AvatarFallback>{user?.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user?.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>
                    <Button onClick={handleNewChat} className="w-full cursor-pointer" disabled={createSession.isPending}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                    </Button>
                    <Button variant="outline" onClick={handleLogout} className="w-full bg-transparent cursor-pointer" disabled={isPending}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )

    const allSessions = sessionsQuery.data?.pages.flatMap((p) => p.items) ?? []
    const hasMore = !!sessionsQuery.data?.pages.at(-1)?.nextCursor

    return (
        <div className="min-h-screen bg-background">
            {/* Confirm Delete Dialog */}
            <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-lg bg-card p-6 shadow-lg focus:outline-none">
                        <Dialog.Title className="text-lg font-semibold mb-2">Delete conversation?</Dialog.Title>
                        <Dialog.Description className="text-sm text-muted-foreground mb-6">
                            This action cannot be undone. This will permanently delete this chat session and its messages.
                        </Dialog.Description>
                        <div className="flex justify-end gap-2">
                            <Dialog.Close asChild>
                                <Button className="cursor-pointer" variant="outline">Cancel</Button>
                            </Dialog.Close>
                            <Button variant="destructive" className="cursor-pointer" onClick={confirmDelete} disabled={deleteSession.isPending}>
                                {deleteSession.isPending ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Rename Dialog */}
            <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-lg bg-card p-6 shadow-lg focus:outline-none">
                        <Dialog.Title className="text-lg font-semibold mb-2">Rename conversation</Dialog.Title>
                        <div className="space-y-4">
                            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Enter a new title" />
                            <div className="flex justify-end gap-2">
                                <Dialog.Close asChild>
                                    <Button className="cursor-pointer" variant="outline">Cancel</Button>
                                </Dialog.Close>
                                <Button className="cursor-pointer" onClick={confirmRename} disabled={renameSession.isPending || !renameValue.trim()}>
                                    {renameSession.isPending ? "Renaming..." : "Save"}
                                </Button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Header */}
            <header className="border-b bg-card sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Career AI</h1>
                        <span className="hidden sm:inline text-muted-foreground">Career Counselor</span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{user?.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{user?.name}</span>
                        </div>
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleLogout} disabled={isPending}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>

                    {/* Mobile Navigation */}
                    <MobileUserMenu />
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 sm:py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome back, {user?.name}!</h2>
                            <p className="text-sm sm:text-base text-muted-foreground">
                                Continue your career counseling journey or start a new conversation.
                            </p>
                        </div>
                        <Button onClick={handleNewChat} className="flex items-center space-x-2 w-full sm:w-auto cursor-pointer" disabled={createSession.isPending}>
                            <Plus className="h-4 w-4" />
                            <span>New Chat</span>
                        </Button>
                    </div>

                    {/* Chat Sessions */}
                    <div className="space-y-4">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Recent Conversations</h3>

                        {sessionsQuery.isLoading ? (
                            <Card className="text-center py-8 sm:py-12">
                                <CardContent>
                                    <CardTitle className="mb-2 text-lg sm:text-xl">Loading conversations...</CardTitle>
                                    <CardDescription className="text-sm sm:text-base">Please wait</CardDescription>
                                </CardContent>
                            </Card>
                        ) : allSessions.length === 0 ? (
                            <Card className="text-center py-8 sm:py-12">
                                <CardContent>
                                    <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                                    <CardTitle className="mb-2 text-lg sm:text-xl">No conversations yet</CardTitle>
                                    <CardDescription className="mb-4 text-sm sm:text-base">
                                        Start your first conversation with our AI career counselor
                                    </CardDescription>
                                    <Button onClick={handleNewChat} className="w-full sm:w-auto cursor-pointer" disabled={createSession.isPending}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Start New Chat
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {allSessions.map((session) => (
                                        <Card
                                            key={session.id}
                                            className="cursor-pointer hover:shadow-md transition-shadow group"
                                            onClick={() => setActiveChat(session.id)}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-base sm:text-lg truncate">{session.title}</CardTitle>
                                                        <CardDescription className="text-xs sm:text-sm">
                                                            {formatRelativeTime(new Date(typeof session.createdAt === "string" ? session.createdAt : (session.createdAt as Date)))}
                                                        </CardDescription>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-8 w-8 p-0"
                                                            onClick={(e) => openRename(session.id, session.title ?? "", e)}
                                                        >
                                                            <span className="text-xs">Rename</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-8 w-8 p-0 cursor-pointer"
                                                            onClick={(e) => requestDeleteSession(session.id, e)}
                                                        >
                                                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                                {hasMore && (
                                    <div className="flex justify-center mt-4">
                                        <Button variant="outline" className="cursor-pointer" onClick={() => sessionsQuery.fetchNextPage()} disabled={sessionsQuery.isFetchingNextPage}>
                                            Load more
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
