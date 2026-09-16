'use client'
// beui.dev/components/agents/prompt-input
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
} from '@/components/ui/select'

const SPRING_SWAP = {
  type: 'spring',
  stiffness: 460,
  damping: 30,
  mass: 0.55,
} as const

export interface PromptModel {
  value: string
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface PromptInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange' | 'onSubmit' | 'children'
> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  models?: PromptModel[]
  model?: string
  defaultModel?: string
  onModelChange?: (model: string) => void
  onSubmit?: (value: string, model?: string) => void | Promise<void>
  loading?: boolean
  onStop?: () => void
  minRows?: number
  maxRows?: number
  leadingAction?: ReactNode
  className?: string
}

export function PromptInput({
  value,
  defaultValue = '',
  onValueChange,
  models = [],
  model,
  defaultModel,
  onModelChange,
  onSubmit,
  loading = false,
  onStop,
  minRows = 2,
  maxRows = 8,
  leadingAction,
  className,
  disabled,
  placeholder = 'Ask the agent to do something…',
  'aria-label': ariaLabel = 'Prompt',
  onKeyDown,
  ...textareaProps
}: PromptInputProps) {
  const reduce = useReducedMotion() ?? false
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const measurementRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [internalModel, setInternalModel] = useState(
    defaultModel ?? models[0]?.value
  )
  const currentValue = value ?? internalValue
  const currentModelValue = model ?? internalModel
  const currentModel = models.find(
    (option) => option.value === currentModelValue
  )
  const canSubmit = Boolean(currentValue.trim()) && !disabled && !loading

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    const measurement = measurementRef.current
    if (!textarea || !measurement || textarea.value !== currentValue) return

    const lineHeight = 24
    const nextHeight = Math.min(
      Math.max(measurement.scrollHeight, minRows * lineHeight),
      maxRows * lineHeight
    )
    const height = `${nextHeight}px`
    if (textarea.style.height !== height) textarea.style.height = height
  }, [currentValue, maxRows, minRows])

  useLayoutEffect(() => {
    resizeTextarea()
  }, [resizeTextarea])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(resizeTextarea)
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [resizeTextarea])

  const setValue = (next: string) => {
    if (value === undefined) setInternalValue(next)
    onValueChange?.(next)
  }

  const setModel = (next: string) => {
    if (model === undefined) setInternalModel(next)
    onModelChange?.(next)
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const prompt = currentValue.trim()
    if (!prompt || disabled || loading) return

    onSubmit?.(prompt, currentModelValue)
    if (value === undefined) setInternalValue('')
    textareaRef.current?.focus({ preventScroll: true })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (
      event.defaultPrevented ||
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }
    event.preventDefault()
    submit()
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        'relative w-full rounded-2xl border border-border/80 bg-background p-2 transition-colors focus-within:ring-2 focus-within:ring-ring',
        disabled && 'opacity-60',
        className
      )}
    >
      <div
        ref={measurementRef}
        aria-hidden='true'
        className='pointer-events-none invisible absolute inset-x-2 top-0 px-2 text-sm leading-6 [overflow-wrap:break-word] whitespace-pre-wrap'
      >
        {`${currentValue}\u200b`}
      </div>
      <textarea
        ref={textareaRef}
        value={currentValue}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={minRows}
        {...textareaProps}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        className='scrollbar-hide block w-full resize-none overflow-y-auto bg-transparent px-2 pt-1.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/55'
      />

      <div className='mt-1 flex min-h-8 items-center gap-1'>
        {leadingAction}
        {models.length ? (
          <Select
            value={currentModelValue}
            onValueChange={setModel}
            disabled={disabled || loading}
          >
            <SelectTrigger
              aria-label='Choose model'
              className='h-8 w-auto max-w-52 rounded-xl border-0 bg-transparent px-2 py-0 text-xs hover:bg-muted focus-visible:ring-2'
            >
              <span className='flex min-w-0 items-center gap-1.5'>
                {currentModel?.icon ? (
                  <span className='grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-3.5'>
                    {currentModel.icon}
                  </span>
                ) : null}
                <span className='truncate text-muted-foreground'>
                  {currentModel?.label ?? 'Choose model'}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent side='top' className='w-64'>
              <SelectGroup>
                {models.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className='py-2'
                  >
                    <span className='flex min-w-0 items-center gap-2'>
                      {option.icon ? (
                        <span className='grid size-5 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4'>
                          {option.icon}
                        </span>
                      ) : null}
                      <span className='min-w-0 truncate text-sm text-foreground'>
                        {option.label}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}

        <Button
          type={loading ? 'button' : 'submit'}
          size='icon'
          disabled={loading ? !onStop : !canSubmit}
          aria-label={loading ? 'Cancel' : 'Send'}
          onClick={loading ? onStop : undefined}
          className='ml-auto size-8 rounded-full'
        >
          <AnimatePresence initial={false} mode='popLayout'>
            <motion.span
              key={loading ? 'stop' : 'send'}
              initial={
                reduce ? { opacity: 1 } : { opacity: 0, y: 3, scale: 0.8 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3, scale: 0.8 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
              className='grid place-items-center'
            >
              {loading ? (
                <Square className='size-3 fill-current' />
              ) : (
                <ArrowUp className='size-4' />
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </form>
  )
}
