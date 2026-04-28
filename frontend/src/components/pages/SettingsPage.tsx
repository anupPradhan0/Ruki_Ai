import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, KeyRound, User as UserIcon, Sparkles, Check, Server, AlertTriangle, X } from "lucide-react"
import { api, session, type AiProvider, type UserType } from "@/lib/api"

type Tab = "info" | "ai"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])
const isHostedDeployment = () =>
  typeof window !== "undefined" && !LOCAL_HOSTS.has(window.location.hostname)

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("info")

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage your profile and AI provider.</p>
      </header>

      <div className="flex gap-1 border-b border-white/10 mb-8">
        <TabButton active={tab === "info"} onClick={() => setTab("info")} icon={<UserIcon size={14} />}>
          Info
        </TabButton>
        <TabButton active={tab === "ai"} onClick={() => setTab("ai")} icon={<Sparkles size={14} />}>
          AI &amp; API
        </TabButton>
      </div>

      {tab === "info" ? <InfoTab /> : <AiTab />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-[#FFD700] text-white"
          : "border-transparent text-white/50 hover:text-white/80"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function InfoTab() {
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined

  const dashQuery = useQuery({
    queryKey: ["dashboard", userType],
    queryFn: () => api.getDashboard(userType as UserType),
    enabled: !!userType && VALID_TYPES.includes(userType),
    retry: false,
  })

  if (dashQuery.isLoading) {
    return <Spinner />
  }

  const user = dashQuery.data?.user

  return (
    <div className="space-y-4">
      <Field label="Email" value={user?.email ?? "—"} />
      <Field label="Full name" value={user?.full_name ?? "—"} />
      <Field label="Currency" value={user?.currency ?? "—"} />
      <Field label="User type" value={userType ?? "—"} />
      <Field label="User ID" value={sess?.user_id ?? "—"} mono />
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-xl px-5 py-4">
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className={`text-sm mt-1 text-white/90 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  )
}

function AiTab() {
  const qc = useQueryClient()

  const providersQuery = useQuery({
    queryKey: ["ai-providers"],
    queryFn: api.getAiProviders,
    retry: false,
  })

  const settingsQuery = useQuery({
    queryKey: ["ai-settings"],
    queryFn: api.getAiSettings,
    retry: false,
  })

  const [provider, setProvider] = useState<string>("")
  const [model, setModel] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [savedFlash, setSavedFlash] = useState(false)
  const [showLocalWarning, setShowLocalWarning] = useState(false)

  useEffect(() => {
    if (settingsQuery.data) {
      setProvider(settingsQuery.data.provider)
      setModel(settingsQuery.data.model)
    }
  }, [settingsQuery.data])

  const providers = providersQuery.data?.providers ?? []
  const currentProvider: AiProvider | undefined = providers.find((p) => p.id === provider)

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateAiSettings({
        provider,
        model,
        api_key: currentProvider?.needs_api_key && apiKey ? apiKey : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] })
      // Cached dashboard advice was generated under the old provider/model.
      // Invalidate so the next dashboard view re-fetches and triggers regeneration.
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setApiKey("")
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    },
  })

  // If the saved/loaded model isn't valid for the currently selected provider
  // (e.g. provider list arrived after settings, or someone changed it server-side),
  // snap to the first available model so the <select> never displays a stale value.
  useEffect(() => {
    if (!currentProvider || !model) return
    if (!currentProvider.models.includes(model)) {
      setModel(currentProvider.models[0] ?? "")
    }
  }, [currentProvider, model])

  if (providersQuery.isLoading || settingsQuery.isLoading) return <Spinner />
  if (providersQuery.isError) return <ErrorBox msg={(providersQuery.error as Error).message} />
  if (settingsQuery.isError) return <ErrorBox msg={(settingsQuery.error as Error).message} />

  const applyProvider = (newId: string) => {
    setProvider(newId)
    const prov = providers.find((p) => p.id === newId)
    const firstModel = prov?.models?.[0] ?? ""
    setModel(firstModel)
    setApiKey("")
  }

  const onProviderChange = (newId: string) => {
    if (newId === "local" && isHostedDeployment() && provider !== "local") {
      setShowLocalWarning(true)
      return
    }
    applyProvider(newId)
  }

  const needsKeyButMissing =
    !!currentProvider?.needs_api_key && !apiKey && !settingsQuery.data?.has_api_key

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/50">
        Choose where your AI advice is generated. <span className="text-white/80">Local</span> keeps all your
        data on this server. Other providers send your profile to their API using <em>your</em> key.
      </p>

      <div className="space-y-2">
        <Label>Provider</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProviderChange(p.id)}
              className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                provider === p.id
                  ? "border-[#FFD700]/60 bg-[#FFD700]/5"
                  : "border-white/10 bg-[#111] hover:border-white/20"
              }`}
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {p.needs_api_key ? "Requires API key" : "Runs locally"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD700]/40"
        >
          {currentProvider?.models?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {currentProvider?.needs_api_key && (
        <div className="space-y-2">
          <Label>
            <span className="flex items-center gap-1.5">
              <KeyRound size={12} /> API key
            </span>
          </Label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settingsQuery.data?.has_api_key ? "•••••••• (saved — leave blank to keep)" : "Paste your API key"}
            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#FFD700]/40"
          />
          <p className="text-[11px] text-white/40">
            Stored on this server only. Used to call {currentProvider.label}.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !provider || !model || needsKeyButMissing}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD700] text-black text-sm font-medium hover:bg-[#e6c200] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
        {savedFlash && (
          <span className="text-sm text-emerald-400 flex items-center gap-1.5">
            <Check size={14} /> Saved
          </span>
        )}
        {saveMutation.isError && (
          <span className="text-sm text-red-400">{(saveMutation.error as Error).message}</span>
        )}
      </div>

      {showLocalWarning && (
        <LocalWarningModal
          onCancel={() => setShowLocalWarning(false)}
          onConfirm={() => {
            setShowLocalWarning(false)
            applyProvider("local")
          }}
        />
      )}
    </div>
  )
}

function LocalWarningModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-md bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="text-amber-400" size={20} />
        </div>

        <h2 className="text-lg font-semibold mb-2">Local model needs to run on your machine</h2>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          The <span className="text-white/90">Local (Ollama)</span> option runs the AI on the same
          computer the backend is on. This site is hosted online — there's no Ollama running on the
          server, so the local model won't actually answer here.
        </p>

        <div className="flex gap-3 p-3 rounded-xl border border-white/5 bg-[#0F0F0F] mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 text-[#FFD700] flex items-center justify-center shrink-0">
            <Server size={15} />
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            To use this option, run RukiAI on your own computer or server with Ollama installed.
            Otherwise, pick a cloud provider (OpenAI, Gemini, Anthropic, Cohere) and add your own
            API key.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-white/80 hover:border-white/20 hover:text-white transition-colors"
          >
            Pick another provider
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#FFD700] text-black text-sm font-semibold hover:bg-[#e6c200] transition-colors"
          >
            I'll self-host it
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] uppercase tracking-wide text-white/50">{children}</label>
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="text-white/40 animate-spin" size={22} />
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{msg}</div>
  )
}
