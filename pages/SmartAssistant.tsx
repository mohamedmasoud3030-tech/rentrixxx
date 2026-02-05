import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Sparkles, Bot, User, X, Send } from 'lucide-react';
import { queryAssistant } from '../services/geminiService';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbEngine } from '../services/db';

interface Message {
    sender: 'user' | 'ai' | 'error';
    text: string;
}

const SmartAssistant: React.FC = () => {
    const { settings } = useApp();
    const [isOpen, setIsOpen] = useState(false);

    if (!settings.integrations.geminiApiKey) {
        return null;
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-opacity-90 transition-transform transform hover:scale-110"
                aria-label="افتح المساعد الذكي"
            >
                <Sparkles size={24} />
            </button>
            {isOpen && <AssistantModal onClose={() => setIsOpen(false)} />}
        </>
    );
};

const AssistantModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { settings, ownerBalances, contractBalances } = useApp();
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي. كيف يمكنني مساعدتك في تحليل بياناتك اليوم؟' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Fetch data required for context directly
    const tenants = useLiveQuery(() => dbEngine.tenants.toArray());
    const units = useLiveQuery(() => dbEngine.units.toArray());
    const contracts = useLiveQuery(() => dbEngine.contracts.toArray());
    const owners = useLiveQuery(() => dbEngine.owners.toArray());
    const receipts = useLiveQuery(() => dbEngine.receipts.toArray());
    const expenses = useLiveQuery(() => dbEngine.expenses.toArray());
    const properties = useLiveQuery(() => dbEngine.properties.toArray());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const contextData = useMemo(() => {
        if (!tenants || !units || !contracts || !owners || !receipts || !expenses || !properties) return null;

        const totalCollected = receipts.filter(r => r.status === 'POSTED').reduce((s, r) => s + r.amount, 0);
        const officeExpenses = expenses.filter(e => e.status === 'POSTED' && (e.chargedTo === 'OFFICE' || !e.contractId)).reduce((s, e) => s + e.amount, 0);
        const rentedUnitsCount = new Set(contracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId)).size;

        return {
            tenants: tenants.map(t => ({ id: t.id, name: t.name, status: t.status })),
            units: units.map(u => ({ id: u.id, name: u.name, rent: u.rentDefault, isRented: contracts.some(c => c.unitId === u.id && c.status === 'ACTIVE') })),
            contracts: Object.entries(contractBalances).map(([id, data]) => ({ contractId: id, balance: data.balance })),
            owners: owners.map(o => ({ id: o.id, name: o.name, netBalance: ownerBalances[o.id]?.net })),
            kpis: {
                totalProperties: properties.length,
                occupancyRate: units.length > 0 ? (rentedUnitsCount / units.length) * 100 : 0,
                vacantUnits: units.length - rentedUnitsCount,
                totalCollected,
                totalArrears: Object.values(contractBalances).reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0),
                depositsHeld: contracts.reduce((s, c) => s + c.deposit, 0),
                officeExpenses,
            },
        };
    }, [tenants, units, contracts, owners, receipts, expenses, properties, ownerBalances, contractBalances]);


    const handleSend = async () => {
        if (!input.trim() || isLoading || !contextData) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await queryAssistant(settings.integrations.geminiApiKey, input, JSON.stringify(contextData));
            setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
        } catch (error) {
            console.error(error);
            const errorMessage = (error as Error).message.includes("API key not valid")
                ? "مفتاح API غير صالح. يرجى التحقق منه في الإعدادات."
                : "حدث خطأ أثناء التواصل مع المساعد الذكي. يرجى المحاولة مرة أخرى.";
            setMessages(prev => [...prev, { sender: 'error', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed bottom-24 left-6 w-96 h-[60vh] bg-card shadow-2xl rounded-lg z-50 flex flex-col border border-border">
            <header className="flex justify-between items-center p-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Bot className="text-primary" />
                    <h3 className="font-bold text-text">المساعد الذكي</h3>
                </div>
                <button onClick={onClose} className="text-text-muted hover:text-text"><X size={20} /></button>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                         {msg.sender !== 'user' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Bot size={18} className="text-primary"/></div>}
                        <div className={`p-3 rounded-lg max-w-[80%] ${
                            msg.sender === 'ai' ? 'bg-background text-text' :
                            msg.sender === 'user' ? 'bg-primary text-white' :
                            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                         {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0"><User size={18} className="text-secondary"/></div>}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Bot size={18} className="text-primary"/></div>
                        <div className="p-3 rounded-lg bg-background text-text">
                           <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                           </div>
                        </div>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-3 border-t border-border">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder="اسأل عن أي شيء في بياناتك..."
                        className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading} className="absolute left-2 top-1/2 -translate-y-1/2 text-primary disabled:text-text-muted">
                        <Send size={20} />
                    </button>
                </div>
            </footer>
        </div>
    );
};


export default SmartAssistant;