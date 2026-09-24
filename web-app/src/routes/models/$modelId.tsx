import { createFileRoute } from '@tanstack/react-router'
import { ModelDetailScreen } from '@/hb/features/model-detail'

export const Route = createFileRoute('/models/$modelId')({ component: ModelDetailScreen })
