import { createContext, useContext, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { ArrowDownIcon, CheckIcon, CopyIcon, RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie, setCookie } from '@/lib/cookies'
import { Button } from '@/components/ui/button'
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
import { DataViewCard } from './data-view-card'
import {
  buildCopyMarkdown,
  hasExportableContent,
  type CopyPart,
} from './message-markdown'

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
  const state =
    status.type === 'running'
      ? 'running'
      : status.type === 'incomplete' && status.reason === 'cancelled'
        ? 'cancelled'
        : isError || status.type === 'incomplete'
          ? 'query-error'
          : 'complete'
  return (
    <div className='min-w-0'>
      {state !== 'running' && (
        <DataViewCard result={result} state={state} language='en' />
      )}
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
    <MessagePrimitive.Root className='ml-auto w-fit max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap'>
      <MessagePrimitive.Parts />
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
      (s.message.metadata?.custom as { modelId?: unknown } | undefined)
        ?.modelId
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
}: {
  models: AssistantModelOption[]
  modelId: string
  onModelChange: (id: string) => void
  isLoading: boolean
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
      onStop={() => aui.thread.cancelRun()}
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
      placeholder='Type a question…'
      aria-label='Message for assistant'
      maxRows={6}
    />
  )
}

export function AssistantPage({
  workspace,
}: {
  workspace: 'absensi' | 'lupg'
}) {
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const [modelId, setModelId] = useState(
    () => getCookie(MODEL_COOKIE) ?? DEFAULT_MODEL
  )
  const { data: models = [], isLoading } = useQuery({
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
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: '/api/assistant/chat',
        headers: async () => ({
          authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
        }),
        // Resolved per send so model switches apply to the next message.
        body: () => ({ workspace, modelId }),
      }),
    [workspace, modelId]
  )
  const runtime = useChatRuntime({ transport })
  return (
    <>
      <UtilityHeader fixed />
      <Main fixed className='min-h-0 px-2 py-0 sm:px-4'>
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitive.Root className='mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col'>
            <ThreadPrimitive.Viewport className='flex min-h-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-6 sm:px-4'>
              <ThreadPrimitive.Empty>
                <div className='py-16 text-center text-sm text-muted-foreground'>
                  Ask for this month&apos;s{' '}
                  {workspace === 'absensi' ? 'Absensi' : 'LUPG'} dashboard
                  summary.
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
            <div className='relative shrink-0 bg-background px-2 pt-2 pb-4 sm:px-4'>
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
                isLoading={isLoading}
                onModelChange={(id) => {
                  setModelId(id)
                  setCookie(MODEL_COOKIE, id)
                }}
              />
            </div>
          </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
      </Main>
    </>
  )
}
