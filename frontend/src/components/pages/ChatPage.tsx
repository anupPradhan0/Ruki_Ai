import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Send, Loader2, Sparkles, Plus, KeyRound, Server, ArrowRight } from "lucide-react"
import { api, session, type ChatTurn, type UserType } from "@/lib/api"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])
const isHostedDeployment = () =>
  typeof window !== "undefined" && !LOCAL_HOSTS.has(window.location.hostname)

interface ChatPageProps {
  conversationId?: string
}

export default function ChatPage({ conversationId }: ChatPageProps = {}) {
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const dashQuery = useQuery({
    queryKey: ["dashboard", userType],
    queryFn: () => api.getDashboard(userType as UserType),
    enabled: !!userType && VALID_TYPES.includes(userType),
    retry: false,
  })

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => api.getAiSettings(),
    retry: false,
  })

  // Load persisted history when viewing an existing conversation.
  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => api.getConversation(conversationId as string),
    enabled: !!conversationId,
    retry: false,
  })

  const hosted = isHostedDeployment()
  const provider = aiSettingsQuery.data?.provider
  const hasApiKey = aiSettingsQuery.data?.has_api_key ?? false
  const needsCloudSetup =
    hosted && aiSettingsQuery.isSuccess && (provider === "local" || !hasApiKey)

  const rawAdvice = dashQuery.data?.ai_advice
  const initialAdvice =
    rawAdvice && !rawAdvice.startsWith("Unable to generate") ? rawAdvice : undefined

  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // When the route's conversationId changes, reset local state and load
  // its history. For a fresh /dashboard/chat (no id), seed with the dashboard advice.
  useEffect(() => {
    if (conversationId) {
      const loaded = conversationQuery.data?.messages
      setMessages(loaded ?? [])
    } else {
      setMessages(initialAdvice ? [{ role: "assistant", content: initialAdvice }] : [])
    }
    // We intentionally key off conversationId + the loaded data — switching chats
    // should clear the view, and the initialAdvice seed only applies to new chats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversationQuery.data, initialAdvice])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!userType) throw new Error("Missing user type")
      // Optimistic: show the user's message immediately.
      setMessages((prev) => [...prev, { role: "user", content: msg }])
      const res = await api.chat(userType, msg, messages, conversationId)
      return res
    },
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }])
      // Refresh the sidebar list so the conversation order/title updates.
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      // First message of a brand-new chat — navigate to the conversation URL
      // so refresh works and the sidebar can highlight it.
      if (!conversationId && res.conversation_id) {
        navigate({ to: `/dashboard/chat/${res.conversation_id}` })
      }
    },
    onError: () => {
      // Roll back the optimistic user message on failure.
      setMessages((prev) => (prev.length && prev[prev.length - 1].role === "user" ? prev.slice(0, -1) : prev))
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

  // Wait for the AI settings query before deciding what to render — avoids
  // flashing the empty state and then swapping it for the gate.
  if (aiSettingsQuery.isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center">
        <Loader2 className="text-white/40 animate-spin" size={24} />
      </div>
    )
  }

  if (needsCloudSetup) {
    return <CloudSetupGate provider={provider} hasApiKey={hasApiKey} />
  }

  // Show a spinner while loading an existing conversation's history.
  if (conversationId && conversationQuery.isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center">
        <Loader2 className="text-white/40 animate-spin" size={24} />
      </div>
    )
  }

  const isEmpty = messages.length === 0 && !dashQuery.isLoading

  // Empty state — centered greeting + composer (Gemini/Claude style).
  if (isEmpty) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center px-4 sm:px-6">
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {composer}
          {disclaimer}
        </div>
      </div>
    </div>
  )
}

function CloudSetupGate({
  provider,
  hasApiKey,
}: {
  provider: string | undefined
  hasApiKey: boolean
}) {
  const reason =
    provider === "local"
      ? "You're set to the Local (Ollama) model, which only runs on a machine with Ollama installed. This site is hosted on a public server, so the local runtime isn't available here."
      : !hasApiKey
        ? "Your selected provider needs an API key before it can answer chat messages."
        : "Pick a cloud provider and add an API key to start chatting."

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-lg">
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-6 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-5">
            <KeyRound className="text-[#FFD700]" size={22} />
          </div>
          <h1 className="text-xl font-semibold mb-2">Add an API key to start chatting</h1>
          <p className="text-sm text-white/60 leading-relaxed mb-6">{reason}</p>

          <div className="space-y-3 mb-6">
            <Option
              icon={<KeyRound size={16} />}
              title="Use a cloud provider"
              body="Pick OpenAI, Gemini, Anthropic, or Cohere in Settings and paste your own API key. Your key is stored on your account and only used for your requests."
            />
            <Option
              icon={<Server size={16} />}
              title="Or run RukiAI yourself"
              body="Self-host the app on your own machine or server and use the free local Ollama model — no key, fully private."
            />
          </div>

          <Link
            to="/dashboard/settings"
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all"
          >
            Open Settings
            <ArrowRight size={16} />
          </Link>

          <p className="text-[11px] text-white/30 text-center mt-4">
            Once your key is saved, come back here — your dashboard summary will be the first message.
          </p>
        </div>
      </div>
    </div>
  )
}

function Option({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-white/5 bg-[#0F0F0F]">
      <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 text-[#FFD700] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{body}</p>
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
