import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import AIInsightsWidget from "@/components/dashboard/AIInsightsWidget";

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="h-5 w-5 text-white" />
                </div>
            )}
            <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
                <div className={cn(
                    "rounded-2xl px-5 py-3.5 shadow-sm",
                    isUser 
                        ? "bg-slate-800 text-white rounded-tr-none" 
                        : "bg-white border border-slate-100 rounded-tl-none"
                )}>
                    {isUser ? (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : (
                        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
            {isUser && (
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-5 w-5 text-slate-500" />
                </div>
            )}
        </div>
    );
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        // Initialize conversation
        const initConversation = async () => {
            try {
                // Check for existing or create new
                const existing = await base44.agents.listConversations({ agent_name: 'analyst' });
                let convId;
                if (existing && existing.length > 0) {
                    convId = existing[0].id;
                    setMessages(existing[0].messages || []);
                } else {
                    const newConv = await base44.agents.createConversation({
                        agent_name: 'analyst',
                        metadata: { name: "General Analysis" }
                    });
                    convId = newConv.id;
                }
                setConversationId(convId);
            } catch (error) {
                console.error("Error initializing chat", error);
            }
        };
        initConversation();
    }, []);

    useEffect(() => {
        if (!conversationId) return;

        const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
            setMessages(data.messages);
            setIsLoading(data.status === 'running');
        });

        return () => unsubscribe();
    }, [conversationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !conversationId) return;

        const content = input;
        setInput("");
        setIsLoading(true);

        try {
            await base44.agents.addMessage({ id: conversationId }, {
                role: "user",
                content: content
            });
        } catch (error) {
            console.error("Error sending message", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col max-w-6xl mx-auto p-4 gap-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Assistente AI</h1>
                    <p className="text-slate-500">Analisi predittiva e supporto decisionale</p>
                </div>
            </div>

            {/* AI Insights Section - Always visible at top */}
            <AIInsightsWidget />

            {/* Chat Section */}
            <Card className="flex-1 flex flex-col border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <Bot className="w-16 h-16 text-indigo-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-700">Come posso aiutarti oggi?</h3>
                            <p className="text-sm text-slate-500 max-w-md mt-2">
                                Chiedimi di analizzare i costi, cercare cantieri in ritardo, 
                                o generare report specifici sui subappalti.
                            </p>
                            <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg w-full">
                                {[
                                    "Mostrami i cantieri con costi > 50k",
                                    "Ci sono anomalie nei SAL recenti?",
                                    "Qual è il trend dei costi questo mese?",
                                    "Lista delle imprese attive"
                                ].map((suggestion, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setInput(suggestion)}
                                        className="text-xs text-slate-600 bg-white border border-slate-200 p-3 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-left"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <MessageBubble key={idx} message={msg} />
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md mr-3">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSubmit} className="flex gap-3 relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Chiedi all'IA di analizzare i dati..."
                            className="pr-12 py-6 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <Button 
                            type="submit" 
                            size="icon" 
                            disabled={isLoading || !input.trim()}
                            className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                        L'IA può commettere errori. Verifica sempre i dati importanti.
                    </p>
                </div>
            </Card>
        </div>
    );
}