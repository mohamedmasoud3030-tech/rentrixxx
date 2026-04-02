import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Bot, User, X, Send } from 'lucide-react';
import { queryAssistant } from '../services/geminiService';
import { logger } from '../services/logger';

interface Message {
    sender: 'user' | 'ai' | 'error';
    text: string;
}

const SmartAssistant: React.FC = () => {
    return <AssistantModal onClose={() => window.history.back()} />;
};

const AssistantModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { db, ownerBalances, contractBalances } = useApp();
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي. كيف يمكنني مساعدتك في تحليل بياناتك اليوم؟' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const tenants = db.tenants || [];
    const units = db.units || [];
    const contracts = db.contracts || [];
    const owners = db.owners || [];
    const receipts = db.receipts || [];
    const expenses = db.expenses || [];
    const properties = db.properties || [];

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
            const responseText = await queryAssistant('', input, JSON.stringify(contextData));
            setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
        } catch (error) {
            logger.error('[SmartAssistantPage] query failed', error);
            const errorMessage = "حدث خطأ أثناء التواصل مع المساعد الذكي. يرجى المحاولة مرة أخرى.";
            setMessages(prev => [...prev, { sender: 'error', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Bot className="text-primary" size={32} />
                        <div>
                            <h1 className="text-2xl font-bold text-text">المساعد الذكي</h1>
                            <p className="text-text-muted">اسأل عن أي شيء في بياناتك</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text p-2">
                        <X size={24} />
                    </button>
                </header>
                
                <div className="bg-card border border-border rounded-lg shadow-sm h-[70vh] flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender !== 'user' && <Bot className="text-primary mt-1 flex-shrink-0" size={20} />}
                                <div className={`max-w-[70%] p-4 rounded-lg ${
                                    msg.sender === 'ai' ? 'bg-background text-text' :
                                    msg.sender === 'user' ? 'bg-primary text-white' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                }`}>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                </div>
                                {msg.sender === 'user' && <User className="text-secondary mt-1 flex-shrink-0" size={20} />}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <Bot className="text-primary mt-1 flex-shrink-0" size={20} />
                                <div className="p-4 rounded-lg bg-background text-text">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="p-6 border-t border-border">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                placeholder="اسأل عن أي شيء في بياناتك..."
                                className="flex-1 rounded-md border border-border bg-background py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={isLoading}
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={isLoading || !input.trim()} 
                                className="bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send size={18} />
                                إرسال
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default SmartAssistant;
