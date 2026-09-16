import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type AssistantModelOption } from '@/mastra/http'
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/ai-sdk'
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  type ToolCallMessagePartComponent,
} from '@assistant-ui/react'
import type { UIMessage } from 'ai'
import {
  ArrowDownIcon,
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  PanelLeftIcon,
  PencilIcon,
  RotateCcwIcon,
  SquarePenIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie, setCookie } from '@/lib/cookies'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ThinkingShimmer } from '@/components/agents/loading-states/thinking-shimmer'
import { PromptInput } from '@/components/agents/prompt-input'
import { Main } from '@/components/layout/main'
import { UtilityHeader } from '@/components/layout/utility-header'
import { AssistantMarkdown } from './assistant-markdown'
import {
  ASSISTANT_THREAD_TITLE_MAX,
  cancelAssistantRun,
  deleteAssistantThread,
  getAssistantHistory,
  listAssistantThreads,
  mergeAssistantHistory,
  prepareAssistantChatRequest,
  renameAssistantThread,
  type AssistantThread,
} from './conversation-client'
import { parseDataView } from './data-view'
import { DataViewCard } from './data-view-card'
import {
  buildCopyMarkdown,
  hasExportableContent,
  type CopyPart,
} from './message-markdown'
import { getToolResultState } from './tool-result-state'

const MODEL_COOKIE = 'assistant_model'
const DEFAULT_MODEL = 'gpt-5.6-terra'

const ModelLabelsContext = createContext<AssistantModelOption[]>([])

const ToolResult: ToolCallMessagePartComponent = ({
  toolName,
  status,
  result,
  isError,
}) => {
  if (status.type === 'requires-action') return null
  const state = getToolResultState(status, result, isError)
  const isDataView =
    result === undefined || parseDataView(result).status !== 'validation-error'
  if (!isDataView)
    return state === 'running' ? null : (
      <p className='text-sm text-muted-foreground'>Tool completed.</p>
    )
  return (
    <div className='min-w-0'>
      <DataViewCard result={result} state={state} language='en' />
      <details className='mt-2 text-xs text-muted-foreground'>
        <summary className='cursor-pointer rounded py-1 [overflow-wrap:anywhere]'>
          Execution details · {state}
        </summary>
        <p className='py-2 [overflow-wrap:anywhere]'>{toolName}</p>
      </details>
    </div>
  )
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className='ml-auto flex w-fit max-w-[85%] flex-col items-end gap-1 sm:max-w-2xl 2xl:max-w-3xl'>
      <div className='rounded-2xl bg-muted px-4 py-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap'>
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  )
}

function CopyMessageButton() {
  const parts = useAuiState((s) => s.message.parts) as unknown as
    | readonly CopyPart[]
    | undefined
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!parts || !hasExportableContent(parts)) return
    const markdown = buildCopyMarkdown(parts)
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      toast.success('Response copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  const exportable = !!parts && hasExportableContent(parts)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='size-7 rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2'
          onClick={handleCopy}
          disabled={!exportable}
          aria-label={copied ? 'Copied' : 'Copy response'}
        >
          {copied ? (
            <CheckIcon className='size-3.5 text-emerald-600 dark:text-emerald-400' />
          ) : (
            <CopyIcon className='size-3.5' />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        {copied ? 'Copied!' : 'Copy response'}
      </TooltipContent>
    </Tooltip>
  )
}

function ReloadMessageButton() {
  const modelId = useAuiState(
    (s) =>
      (s.message.metadata?.custom as { modelId?: unknown } | undefined)?.modelId
  )
  const models = useContext(ModelLabelsContext)
  const modelLabel =
    models.find((model) => model.id === modelId)?.label ??
    (typeof modelId === 'string' ? modelId : null)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ActionBarPrimitive.Reload asChild>
          <Button
            variant='ghost'
            size='icon'
            className='size-7 rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2'
            aria-label='Retry'
          >
            <RotateCcwIcon className='size-3.5' />
          </Button>
        </ActionBarPrimitive.Reload>
      </TooltipTrigger>
      <TooltipContent side='bottom' className='text-center'>
        <p className='font-medium'>Try again…</p>
        {modelLabel ? <p>Used {modelLabel}</p> : null}
      </TooltipContent>
    </Tooltip>
  )
}

function AssistantActionBar() {
  return (
    <ThreadPrimitive.If running={false}>
      <div className='flex items-center gap-0.5 self-start pt-1'>
        <CopyMessageButton />
        <ReloadMessageButton />
      </div>
    </ThreadPrimitive.If>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className='flex w-full min-w-0 flex-col gap-3'>
      <div className='flex min-w-0 flex-col gap-4'>
        <MessagePrimitive.Parts
          components={{
            Text: AssistantMarkdown,
            tools: { Fallback: ToolResult },
          }}
        />
        <MessagePrimitive.Error>
          <p role='alert' className='text-sm text-destructive'>
            Response incomplete. Please try again.
          </p>
        </MessagePrimitive.Error>
      </div>
      <AssistantActionBar />
    </MessagePrimitive.Root>
  )
}

function ChatComposer({
  models,
  modelId,
  onModelChange,
  isLoading,
  activeThread,
  onStop,
}: {
  models: AssistantModelOption[]
  modelId: string
  onModelChange: (id: string) => void
  isLoading: boolean
  activeThread: string | null
  onStop: () => void
}) {
  const aui = useAui()
  const text = useAuiState((s) => s.composer.text)
  const running = useAuiState((s) => s.thread.isRunning)
  return (
    <PromptInput
      value={text}
      onValueChange={(value) => aui.composer.setText(value)}
      onSubmit={() => aui.composer.send()}
      loading={running}
      onStop={() => {
        onStop()
        aui.thread.cancelRun()
      }}
      models={
        models.length
          ? models.map((model) => ({
              value: model.id,
              label:
                model.label +
                (!model.enabled && model.disabledReason
                  ? ` · ${model.disabledReason}`
                  : ''),
              disabled: !model.enabled,
            }))
          : [
              {
                value: modelId,
                label: isLoading ? 'Loading models…' : modelId,
                disabled: true,
              },
            ]
      }
      model={modelId}
      onModelChange={onModelChange}
      placeholder={
        activeThread ? 'Type a question…' : 'Start a new conversation…'
      }
      aria-label='Message for assistant'
      maxRows={6}
    />
  )
}

type DeleteTarget = { threadId: string; title: string }

function AssistantSidebar({
  activeThread,
  error,
  isLoading,
  onDelete,
  onNewChat,
  onOpenThread,
  onRename,
  onRetry,
  threads,
  workspace,
}: {
  activeThread: string | null
  error: string | null
  isLoading: boolean
  onDelete: (thread: AssistantThread) => void
  onNewChat: () => void
  onOpenThread: (id: string) => void
  onRename: (thread: AssistantThread) => void
  onRetry: () => void
  threads: AssistantThread[]
  workspace: 'absensi' | 'lupg'
}) {
  const workspaceLabel = workspace === 'absensi' ? 'Absensi' : 'LUPG'
  return (
    <div className='flex min-h-0 w-full flex-col border-r border-sidebar-border bg-sidebar/30 px-3 py-4 text-sidebar-foreground dark:bg-sidebar/20'>
      <div className='shrink-0 space-y-3'>
        <div className='px-1'>
          <p className='text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/65 uppercase'>
            AI Assistant
          </p>
          <p className='mt-0.5 text-xs text-sidebar-foreground/60'>
            {workspaceLabel} workspace
          </p>
        </div>
        <Button
          variant='ghost'
          onClick={onNewChat}
          className='h-10 w-full justify-start gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.98]'
        >
          <SquarePenIcon className='size-4' />
          New chat
        </Button>
        <div className='my-2 border-t border-sidebar-border/70' />
        <div className='flex items-center justify-between px-1 pt-1'>
          <p className='text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/60 uppercase'>
            Recents
          </p>
          {!isLoading && threads.length > 0 && (
            <span className='rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-medium text-sidebar-accent-foreground tabular-nums'>
              {threads.length}
            </span>
          )}
        </div>
      </div>
      <div className='mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5'>
        {isLoading && (
          <div
            className='space-y-1.5 px-1 py-1'
            aria-label='Loading conversations'
          >
            <div className='h-10 animate-pulse rounded-xl bg-sidebar-accent/70' />
            <div className='h-10 animate-pulse rounded-xl bg-sidebar-accent/50' />
            <div className='h-10 animate-pulse rounded-xl bg-sidebar-accent/35' />
          </div>
        )}
        {error && (
          <div className='mx-1 space-y-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            <p role='alert'>{error}</p>
            <Button variant='outline' size='sm' onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && threads.length === 0 && (
          <p className='mx-1 rounded-xl border border-dashed border-sidebar-border px-3 py-4 text-sm leading-5 text-sidebar-foreground/60'>
            Your recent conversations will appear here.
          </p>
        )}
        {threads.map((thread) => {
          const active = thread.id === activeThread
          return (
            <div
              key={thread.id}
              className='group relative flex min-w-0 items-center gap-1 rounded-xl px-1 py-0.5 transition-colors focus-within:bg-sidebar-accent hover:bg-sidebar-accent'
            >
              {active && (
                <span
                  aria-hidden
                  className='absolute left-0 h-5 w-0.5 rounded-full bg-primary'
                />
              )}
              <Button
                variant='ghost'
                className={`h-10 min-w-0 flex-1 justify-start rounded-lg px-2.5 text-left text-sm transition-transform active:scale-[0.99] ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-xs hover:bg-sidebar-accent'
                    : 'text-sidebar-foreground/85 hover:bg-transparent hover:text-sidebar-accent-foreground'
                }`}
                title={thread.title}
                aria-current={active ? 'page' : undefined}
                onClick={() => onOpenThread(thread.id)}
              >
                <span className='truncate'>{thread.title}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={`size-8 rounded-lg text-sidebar-foreground/60 transition-opacity hover:bg-background/60 hover:text-sidebar-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 ${
                      active ? 'sm:opacity-100' : ''
                    }`}
                    aria-label={`Actions for ${thread.title}`}
                  >
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onSelect={() => onRename(thread)}>
                    <PencilIcon data-icon='inline-start' /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant='destructive'
                    onSelect={() => onDelete(thread)}
                  >
                    <Trash2Icon data-icon='inline-start' /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RenameDialog({
  initialTitle,
  onClose,
  onSubmit,
  open,
}: {
  initialTitle: string
  onClose: () => void
  onSubmit: (title: string) => void
  open: boolean
}) {
  const [title, setTitle] = useState(initialTitle)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>
            Choose a short title for this conversation.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={ASSISTANT_THREAD_TITLE_MAX}
          autoFocus
        />
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() => onSubmit(title.trim())}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConversationThread({
  accessToken,
  activeThread,
  messages,
  nextCursor,
  hasEarlierHistory,
  modelId,
  models,
  modelsLoading,
  onComplete,
  onModelChange,
  workspace,
}: {
  accessToken: string | null
  activeThread: string | null
  messages: UIMessage[]
  nextCursor?: string
  hasEarlierHistory: boolean
  modelId: string
  models: AssistantModelOption[]
  modelsLoading: boolean
  onComplete: (threadId: string) => void
  onModelChange: (id: string) => void
  workspace: 'absensi' | 'lupg'
}) {
  const threadId = useMemo(
    () => activeThread ?? crypto.randomUUID(),
    [activeThread]
  )
  const activeRunId = useRef<string | null>(null)
  const [earlier, setEarlier] = useState<UIMessage[]>([])
  const [cursor, setCursor] = useState(nextCursor)
  const [hasEarlier, setHasEarlier] = useState(hasEarlierHistory)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const loadEarlier = async () => {
    if (!activeThread || loadingEarlier || (!cursor && messages.length === 0))
      return
    setLoadingEarlier(true)
    try {
      const page = await getAssistantHistory(
        accessToken,
        activeThread,
        workspace,
        cursor ?? messages[0]?.id
      )
      setEarlier((current) =>
        mergeAssistantHistory(page.messages, current).slice(0, 80)
      )
      setCursor(page.nextCursor)
      setHasEarlier(page.hasEarlier)
    } catch {
      toast.error('Could not load earlier messages.')
    } finally {
      setLoadingEarlier(false)
    }
  }
  const rendered = useMemo(
    () => mergeAssistantHistory(earlier, messages).slice(0, 100),
    [earlier, messages]
  )
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: '/api/assistant/chat',
        headers: async () => ({
          authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
        }),
        fetch: async (input, init) => {
          const runId = crypto.randomUUID()
          activeRunId.current = runId
          return fetch(input, {
            ...init,
            body: JSON.stringify(
              prepareAssistantChatRequest(init?.body, {
                workspace,
                modelId,
                threadId,
                runId,
              })
            ),
          })
        },
      }),
    [modelId, threadId, workspace]
  )
  const runtime = useChatRuntime({
    id: threadId,
    transport,
    messages: rendered,
    onFinish: ({ isAbort, isError }) => {
      activeRunId.current = null
      if (!isAbort && !isError) onComplete(threadId)
    },
    onError: () => {
      activeRunId.current = null
      toast.error('Response failed. You can retry.')
    },
  })
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className='mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col 2xl:max-w-5xl'>
        <ThreadPrimitive.Viewport className='flex min-h-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 md:px-8'>
          {activeThread && hasEarlier && (
            <Button
              variant='outline'
              size='sm'
              className='self-center'
              disabled={loadingEarlier}
              onClick={loadEarlier}
            >
              {loadingEarlier ? 'Loading…' : 'Load earlier'}
            </Button>
          )}
          <ThreadPrimitive.Empty>
            <div className='py-16 text-center text-sm text-muted-foreground'>
              Ask for this month&apos;s{' '}
              {workspace === 'absensi' ? 'Absensi' : 'LUPG'} dashboard summary.
            </div>
          </ThreadPrimitive.Empty>
          <ModelLabelsContext.Provider value={models}>
            <ThreadPrimitive.Messages
              components={{ UserMessage, AssistantMessage }}
            />
          </ModelLabelsContext.Provider>
          <ThreadPrimitive.If running>
            <div role='status' aria-live='polite' className='py-2 text-sm'>
              <ThinkingShimmer>Composing answer…</ThinkingShimmer>
            </div>
          </ThreadPrimitive.If>
        </ThreadPrimitive.Viewport>
        <div className='relative shrink-0 bg-background px-4 pt-2 pb-5 sm:px-6 md:px-8'>
          <ThreadPrimitive.ScrollToBottom asChild>
            <Button
              variant='outline'
              size='icon'
              className='absolute -top-12 left-1/2 -translate-x-1/2 rounded-full disabled:hidden'
              aria-label='Scroll to latest'
            >
              <ArrowDownIcon />
            </Button>
          </ThreadPrimitive.ScrollToBottom>
          <ChatComposer
            models={models}
            modelId={modelId}
            isLoading={modelsLoading}
            activeThread={activeThread}
            onModelChange={onModelChange}
            onStop={() => {
              const runId = activeRunId.current
              if (runId)
                void cancelAssistantRun(accessToken, runId).catch(() =>
                  toast.error('Could not cancel the server run.')
                )
            }}
          />
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  )
}

export function AssistantPage({
  workspace,
}: {
  workspace: 'absensi' | 'lupg'
}) {
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const [modelId, setModelId] = useState(
    () => getCookie(MODEL_COOKIE) ?? DEFAULT_MODEL
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [renderKey, setRenderKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [renameTarget, setRenameTarget] = useState<AssistantThread | null>(null)
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['assistant-models', accessToken],
    queryFn: async () => {
      const response = await fetch('/api/assistant/models', {
        headers: { authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) throw new Error('MODEL_LIST_ERROR')
      return ((await response.json()).models ?? []) as AssistantModelOption[]
    },
    staleTime: 60_000,
  })
  // ponytail: retry only 503/5xx reads, never 401/403/404; keep data mounted so a failed restore cannot half-replace a thread.
  const assistantRetry = (count: number, error: unknown) =>
    (error as { status?: number })?.status === 503 && count < 1
  const threadsQuery = useQuery({
    queryKey: ['assistant-threads', accessToken, workspace],
    queryFn: () => listAssistantThreads(accessToken, workspace),
    enabled: !!accessToken,
    staleTime: 15_000,
    retry: assistantRetry,
    retryDelay: 500,
  })
  const historyQuery = useQuery({
    queryKey: ['assistant-history', accessToken, workspace, activeThread],
    queryFn: () => getAssistantHistory(accessToken, activeThread!, workspace),
    enabled: !!activeThread && !!accessToken,
    retry: assistantRetry,
    retryDelay: 500,
  })
  const threads = useMemo(
    () =>
      [...(threadsQuery.data?.threads ?? [])].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
    [threadsQuery.data]
  )
  const invalidateThreads = () =>
    void queryClient.invalidateQueries({
      queryKey: ['assistant-threads', accessToken, workspace],
    })
  const startNewChat = () => {
    setActiveThread(null)
    setRenderKey((key) => key + 1)
    setSidebarOpen(false)
  }
  const openThread = (id: string) => {
    setActiveThread(id)
    setRenderKey((key) => key + 1)
    setSidebarOpen(false)
  }
  const confirmDelete = async () => {
    const target = deleteTarget
    if (!target) return
    setDeleteTarget(null)
    try {
      await deleteAssistantThread(accessToken, target.threadId, workspace)
      if (target.threadId === activeThread) startNewChat()
      toast.success('Conversation deleted')
      invalidateThreads()
    } catch {
      toast.error('Delete failed. Try again.')
    }
  }
  const sidebar = (
    <AssistantSidebar
      workspace={workspace}
      threads={threads}
      activeThread={activeThread}
      isLoading={threadsQuery.isLoading}
      error={threadsQuery.error ? 'Could not load conversations' : null}
      onNewChat={startNewChat}
      onOpenThread={openThread}
      onRename={setRenameTarget}
      onRetry={() => void threadsQuery.refetch()}
      onDelete={(thread) =>
        setDeleteTarget({ threadId: thread.id, title: thread.title })
      }
    />
  )
  return (
    <>
      <UtilityHeader fixed />
      <Main fixed fluid className='min-h-0 p-0'>
        <div className='flex h-full min-h-0 w-full'>
          {!isMobile && (
            <aside className='flex w-64 shrink-0 md:w-72 lg:w-76 xl:w-80'>
              {sidebar}
            </aside>
          )}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-2 left-2 z-20'
                  aria-label='Open conversations'
                >
                  <PanelLeftIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side='left' className='w-72 p-0'>
                <SheetHeader className='sr-only'>
                  <SheetTitle>Conversations</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
          )}
          {activeThread && historyQuery.isLoading ? (
            <p className='m-auto text-sm text-muted-foreground'>
              Loading conversation…
            </p>
          ) : historyQuery.isError && !historyQuery.data ? (
            <div className='m-auto flex flex-col items-center gap-3 text-sm'>
              <p role='alert' className='text-destructive'>
                Could not restore this conversation. Try again.
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => void historyQuery.refetch()}
                >
                  Retry
                </Button>
                <Button variant='outline' size='sm' onClick={startNewChat}>
                  New chat
                </Button>
              </div>
            </div>
          ) : (
            <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
              {historyQuery.isError && historyQuery.data ? (
                <div
                  role='alert'
                  className='mx-auto mt-3 flex w-full max-w-4xl items-center justify-between gap-3 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive 2xl:max-w-5xl'
                >
                  <span>
                    Conversation refresh failed. Showing saved messages.
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void historyQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
              <ConversationThread
                key={`${activeThread ?? 'new'}-${renderKey}`}
                accessToken={accessToken}
                activeThread={activeThread}
                messages={historyQuery.data?.messages ?? []}
                nextCursor={historyQuery.data?.nextCursor}
                hasEarlierHistory={historyQuery.data?.hasEarlier ?? false}
                modelId={modelId}
                models={models}
                modelsLoading={modelsLoading}
                workspace={workspace}
                onComplete={(threadId) => {
                  setActiveThread(threadId)
                  invalidateThreads()
                }}
                onModelChange={(id) => {
                  setModelId(id)
                  setCookie(MODEL_COOKIE, id)
                }}
              />
            </div>
          )}
        </div>
        <RenameDialog
          key={renameTarget?.id ?? 'closed'}
          open={!!renameTarget}
          initialTitle={renameTarget?.title ?? ''}
          onClose={() => setRenameTarget(null)}
          onSubmit={async (title) => {
            if (!renameTarget) return
            try {
              await renameAssistantThread(
                accessToken,
                renameTarget.id,
                workspace,
                title
              )
              setRenameTarget(null)
              invalidateThreads()
              toast.success('Conversation renamed')
            } catch {
              toast.error('Rename failed. Try again.')
            }
          }}
        />
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {`Delete "${deleteTarget?.title ?? ''}"?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the conversation and its messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className='bg-destructive text-white hover:bg-destructive/90'
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Main>
    </>
  )
}
