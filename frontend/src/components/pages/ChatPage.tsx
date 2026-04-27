import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Send, Loader2, Sparkles, Plus } from "lucide-react"
import { api, session, type ChatTurn, type UserType } from "@/lib/api"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

export default function ChatPage() {
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined

  const dashQuery = useQuery({
    queryKey: ["dashboard", userType],
    queryFn: () => api.getDashboard(userType as UserType),
    enabled: !!userType && VALID_TYPES.includes(userType),
    retry: false,
  })

  const initialAdvice = dashQuery.data?.ai_advice
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Seed the conversation with the existing AI advice once it's available.
  useEffect(() => {
    if (initialAdvice && messages.length === 0) {
      setMessages([{ role: "assistant", content: initialAdvice }])
    }
  }, [initialAdvice, messages.length])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!userType) throw new Error("Missing user type")
      const history = messages
      const res = await api.chat(userType, msg, history)
      return res.reply
    },
    onSuccess: (reply, msg) => {
      setMessages((prev) => [...prev, { role: "user", content: msg }, { role: "assistant", content: reply }])
    },
  })

  const send = () => {
    const trimmed = input.trim()
    if (!trimmed || sendMutation.isPending) return
    setInput("")
    sendMutation.mutate(trimmed)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const composer = (
    <div className="flex flex-col bg-[#1A1A1A] border border-white/10 rounded-2xl px-5 pt-4 pb-3 focus-within:border-[#FFD700]/40 transition-colors">
      <textarea
        ref={inputRef}
        rows={2}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={messages.length > 0 ? "Reply..." : "Ask about your finances, budgeting, goals..."}
        className="bg-transparent resize-none outline-none text-sm text-white placeholder-white/30 leading-relaxed max-h-56 w-full"
        style={{ minHeight: "44px" }}
      />
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          aria-label="Attach"
          disabled
          title="Coming soon"
        >
          <Plus size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30 hidden sm:inline">RukiAI · command-r-plus</span>
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || sendMutation.isPending}
            className="p-2 rounded-lg bg-[#FFD700] text-black hover:bg-[#e6c200] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  const disclaimer = (
    <p className="text-[11px] text-white/30 mt-2 text-center">
      RukiAI can make mistakes. Double-check important advice.
    </p>
  )

  const isEmpty = messages.length === 0 && !dashQuery.isLoading

  // Empty state — centered greeting + composer (Gemini/Claude style).
  if (isEmpty) {
    return (
      <div className="flex flex-col h-screen items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <EmptyState />
          {composer}
          {disclaimer}
        </div>
      </div>
    )
  }

  // Active conversation — composer pinned to the bottom.
  return (
    <div className="flex flex-col h-screen">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {messages.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))}

          {sendMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 size={14} className="animate-spin" />
              <span>RukiAI is thinking...</span>
            </div>
          )}

          {sendMutation.isError && (
            <div className="text-sm text-red-400">{(sendMutation.error as Error).message}</div>
          )}
        </div>
      </div>

      <div className="bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {composer}
          {disclaimer}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-4">
        <Sparkles className="text-[#FFD700]" size={22} />
      </div>
      <h2 className="text-lg font-semibold mb-1">Ask RukiAI anything</h2>
      <p className="text-sm text-white/40 max-w-md">
        Get personalized advice about your budget, savings, investments, or goals.
      </p>
    </div>
  )
}

function Message({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#FFD700] text-black rounded-2xl rounded-tr-md px-4 py-3 text-sm">
          {content}
        </div>
      </div>
    )
  }

  // Assistant — render basic markdown-ish structure.
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-[#FFD700]/10 text-[#FFD700] flex items-center justify-center shrink-0">
        <Sparkles size={14} />
      </div>
      <div className="flex-1 text-sm text-white/85 leading-relaxed space-y-2">
        {content.split("\n").map((raw, i) => {
          const line = raw.trim()
          if (!line) return <div key={i} className="h-1" />
          if (line.startsWith("## ")) {
            return (
              <h3 key={i} className="text-[#FFD700] font-semibold text-sm mt-3">
                {line.replace(/^##\s*/, "")}
              </h3>
            )
          }
          if (line.startsWith("# ")) {
            return (
              <h2 key={i} className="text-white font-semibold text-base mt-3">
                {line.replace(/^#\s*/, "")}
              </h2>
            )
          }
          if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-[#FFD700] shrink-0">•</span>
                <span>{line.replace(/^[•\-*]\s*/, "")}</span>
              </div>
            )
          }
          return <p key={i}>{line}</p>
        })}
      </div>
    </div>
  )
}
