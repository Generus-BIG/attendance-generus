import { type AssistantModelOption } from './http.js'

// Server-only: never import this catalogue into a browser module.
export const models = [
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    deployment: 'gpt-5.5-20260424-global',
    enabled: true,
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    deployment: 'gpt-4.1-mini-20250414-global',
    enabled: true,
  },
  {
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    deployment: 'gpt-5.6-terra-20260709-global',
    enabled: true,
  },
  {
    id: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    deployment: 'gpt-5.6-sol-20260709-global',
    enabled: true,
  },
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    deployment: 'gpt-5.6-luna-20260709-global',
    enabled: true,
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    deployment: 'gpt-4.1-20250414-global',
    enabled: true,
  },
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    deployment: 'gpt-5.2-20251211-global',
    enabled: true,
  },
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    deployment: 'gpt-5.4-20260305-global',
    enabled: true,
  },
] satisfies (AssistantModelOption & { deployment: string })[]
