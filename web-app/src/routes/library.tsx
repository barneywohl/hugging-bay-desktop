import { createFileRoute } from '@tanstack/react-router'
import { LibraryScreen } from '@/hb/features/library'

export const Route = createFileRoute('/library')({ component: LibraryScreen })
