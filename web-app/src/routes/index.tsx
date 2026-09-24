import { createFileRoute } from '@tanstack/react-router'
import { FirstRunScreen } from '@/hb/features/first-run'

export const Route = createFileRoute('/')({ component: FirstRunScreen })
