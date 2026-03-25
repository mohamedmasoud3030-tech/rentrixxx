import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { Bot, User, Send, Sparkles } from 'lucide-react';
import { queryAssistant } from '../services/geminiService';

interface Message {
  sender: 'user' | 'ai' | 'error';
  text: string;
}

const SmartAssistantPage: React.FC = () => {
  const { db, settings, ownerBalances, contractBalances } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'أهلًا بك. أنا مساعدك الذكي، اسألني عن مؤشرات العقود والقبض والمصروفات.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const isConfigured = Boolean(settings.integrations?.geminiApiKey);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const contextData = useMemo(() => {
    const tenants = db.tenants || [];
    const units = db.units || [];
    const contracts = db.contracts || [];
    const owners = db.owners || [];
    const receipts = db.receipts || [];
    const expenses = db.expenses || [];
    const properties = db.properties || [];

    const totalCollected = receipts
      .filter(r => r.status === 'POSTED')
      .reduce((s, r) => s + r.amount, 0);

    const officeExpenses = expenses
      .filter(e => e.status === 'POSTED' && (e.chargedTo === 'OFFICE' || !e.contractId))
      .reduce((s, e) => s + e.amount, 0);

    const rentedUnitsCount = new Set(contracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId)).size;

    return {
      tenants: tenants.map(t => ({ id: t.id, name: t.name, status: t.status })),
      units: units.map(u => ({ id: u.id, name: u.name, rent: u.rentDefault })),
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
  }, [db, ownerBalances, contractBalances]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!isConfigured) {
      setMessages(prev => [...prev, { sender: 'error', text: 'يرجى إضافة مفتاح Gemini من الإعدادات > التكاملات أولًا.' }]);
      return;
    }

    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: question }]);
    setIsLoading(true);

    try {
      const text = await queryAssistant(settings.integrations.geminiApiKey, question, JSON.stringify(contextData));
      setMessages(prev => [...prev, { sender: 'ai', text }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ أثناء التواصل مع المساعد.';
      setMessages(prev => [...prev, { sender: 'error', text: msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-primary" />
        <h2 className="text-xl font-bold">المساعد الذكي</h2>
      </div>

      {!isConfigured && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
          مفتاح Gemini غير مُعد. أضفه من: الإعدادات - التكاملات.
        </div>
      )}

      <div className="h-[60vh] flex flex-col border border-border rounded-lg overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-card">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot size={16} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white'
                    : msg.sender === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-background text-text'
                }`}
              >
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <User size={16} className="text-secondary" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="text-sm text-text-muted">جاري توليد الرد...</div>
          )}
          <div ref={endRef} />
        </main>

        <footer className="border-t border-border p-3">
          <div className="relative">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="اسأل عن أي شيء في بيانات النظام..."
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-primary disabled:text-text-muted"
              aria-label="إرسال"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </div>
    </Card>
  );
};

export default SmartAssistantPage;
