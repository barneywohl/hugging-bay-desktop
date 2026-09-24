import { createFileRoute } from '@tanstack/react-router'
import { DownloadsScreen } from '@/hb/features/downloads'

export const Route = createFileRoute('/downloads/')({ component: DownloadsScreen })
