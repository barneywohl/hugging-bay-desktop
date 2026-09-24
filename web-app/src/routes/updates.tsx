import { createFileRoute } from '@tanstack/react-router'
import { UpdatesScreen } from '@/hb/features/updates'

export const Route = createFileRoute('/updates')({ component: UpdatesScreen })
