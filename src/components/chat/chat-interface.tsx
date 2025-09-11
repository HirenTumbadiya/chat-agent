"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Send, Bot, UserIcon, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/utils/trpc"

interface ChatUser {
  id: string
  email: string
  name: string
}

interface ChatInterfaceProps {
  chatId: string
  user: ChatUser
  onBack: () => void
}

export function ChatInterface({ chatId, user: _user, onBack }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = useState("")

  // TRPC: load messages with cursor pagination
  const messagesQuery = api.message.listBySession.useInfiniteQuery(
    { sessionId: chatId, limit: 30 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
    }
  )

  const sendMutation = api.message.send.useMutation({
    onSuccess: () => {
      setPrompt("")
      messagesQuery.refetch()
    },
  })

  const allPages = messagesQuery.data?.pages ?? []
  const allMessages = allPages.flatMap((p) => p.items) ?? []
  const hasMoreMessages = !!allPages.at(-1)?.nextCursor

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [allMessages.length])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      // Submit the surrounding form
      const form = (e.currentTarget as HTMLInputElement).form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = prompt.trim()
    if (!content) return

    await sendMutation.mutateAsync({ sessionId: chatId, content })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-3 sm:px-4 py-3 flex items-center space-x-3 sm:space-x-4 sticky top-0 z-50">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0 cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
            <AvatarFallback className="bg-accent text-accent-foreground">
              <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground text-sm sm:text-base truncate">AI Career Counselor</h2>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 sm:px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {messagesQuery.isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading messages...</span>
            </div>
          )}

          {messagesQuery.isError && (
            <div className="flex items-center justify-center py-6">
              <span className="text-sm text-destructive">Failed to load messages</span>
            </div>
          )}

          {hasMoreMessages && (
            <div className="flex justify-center">
              <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => messagesQuery.fetchNextPage()} disabled={messagesQuery.isFetchingNextPage}>
                {messagesQuery.isFetchingNextPage ? "Loading..." : "Load older messages"}
              </Button>
            </div>
          )}

          {allMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 sm:space-x-3 ${
                message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                <AvatarFallback
                  className={
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                  }
                >
                  {message.role === "user" ? (
                    <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div
                className={`flex flex-col space-y-1 max-w-[85%] sm:max-w-[80%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <Card className={`${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"} p-0`}>
                  <CardContent className="p-2 sm:p-3">
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
                <span className="text-xs text-muted-foreground px-1">
                  {message.createdAt ? formatTime(new Date(typeof message.createdAt === "string" ? message.createdAt : (message.createdAt as Date))) : "Now"}
                </span>
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                <AvatarFallback className="bg-accent text-accent-foreground">
                  <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-card">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span className="text-xs sm:text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-3 sm:p-4 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto">
          <form className="flex items-end space-x-2" onSubmit={handleSubmit}>
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about your career..."
                className="min-h-[40px] sm:min-h-[44px] resize-none text-sm sm:text-base"
                disabled={sendMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={!prompt.trim() || sendMutation.isPending}
              size="sm"
              className="h-[40px] sm:h-[44px] px-3 sm:px-4 flex-shrink-0 cursor-pointer"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
