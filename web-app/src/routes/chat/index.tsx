import { createFileRoute } from '@tanstack/react-router'
import { ChatScreen } from '@/hb/features/chat'

export const Route = createFileRoute('/chat/')({ component: ChatScreen })
