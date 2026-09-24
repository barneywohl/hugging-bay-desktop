import { createFileRoute } from '@tanstack/react-router'
import { DiscoverScreen } from '@/hb/features/discover'

export const Route = createFileRoute('/discover')({ component: DiscoverScreen })
