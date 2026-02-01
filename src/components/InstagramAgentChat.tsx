import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Send, Sparkles, X, Bot, User } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export function InstagramAgentChat({ contextData }: { contextData: any }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsLoading(true)

        try {
            const { data, error } = await supabase.functions.invoke('instagram-analytics', {
                body: {
                    action: 'chat_agent',
                    messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                    context: contextData
                }
            })

            if (error) throw error

            if (data?.reply) {
                const agentMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.reply,
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, agentMsg])
            }
        } catch (err) {
            console.error("Chat error:", err)
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-0 z-[100] transition-all duration-300 hover:scale-110"
                >
                    <MessageCircle className="h-7 w-7" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 border-l border-zinc-800 bg-zinc-950">
                <SheetHeader className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                    <SheetTitle className="flex items-center gap-3 text-white">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">AI Content Strategist</h3>
                            <p className="text-xs text-zinc-400 font-normal">Ask me anything about your data</p>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-hidden relative bg-zinc-950/50">
                    <ScrollArea className="h-full p-6">
                        <div className="space-y-6 pb-4">
                            {messages.length === 0 && (
                                <div className="text-center space-y-4 pt-10 opacity-70">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                        <Sparkles className="w-8 h-8 text-purple-500" />
                                    </div>
                                    <p className="text-zinc-400 text-sm">
                                        I've analyzed your content context. <br />
                                        Ask me about your top posts, engagement trends,<br /> or for new content ideas!
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <Button variant="outline" size="sm" className="bg-zinc-900/50 border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors" onClick={() => setInput("Why exactly did my top post perform well?")}>
                                            Why did my top post win?
                                        </Button>
                                        <Button variant="outline" size="sm" className="bg-zinc-900/50 border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors" onClick={() => setInput("Give me 3 content ideas for next week.")}>
                                            3 ideas for next week
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    {message.role === 'assistant' && (
                                        <Avatar className="h-8 w-8 border border-purple-500/30">
                                            <AvatarImage src="/ai-avatar.png" />
                                            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs">AI</AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div
                                        className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${message.role === 'user'
                                            ? 'bg-purple-600 text-white rounded-br-none'
                                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                                            }`}
                                    >
                                        {message.content}
                                    </div>

                                    {message.role === 'user' && (
                                        <Avatar className="h-8 w-8 border border-zinc-700">
                                            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">ME</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3 justify-start">
                                    <Avatar className="h-8 w-8 border border-purple-500/30">
                                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs">AI</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSend()
                        }}
                        className="flex gap-2 relative"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask for strategy advice..."
                            disabled={isLoading}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 pr-12 h-12 rounded-xl focus-visible:ring-purple-500/50"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-10 w-10 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
