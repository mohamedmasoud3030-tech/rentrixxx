import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/format';
import { useCreateMessage, useCreateTemplate, useMessages, useRecipients, useTemplates, useUpdateMessageStatus } from '@/features/communication/use-communication';

export function CommunicationHubPage() {
  const [channel, setChannel] = useState<'all'|'note'|'whatsapp'|'email'|'sms'>('all');
  const [status, setStatus] = useState<'all'|'draft'|'queued'|'sent'|'failed'>('all');
  const [search, setSearch] = useState('');
  const messages = useMessages({ channel, status, search });
  const recipients = useRecipients();
  const templates = useTemplates(channel === 'all' ? undefined : channel);
  const createMessage = useCreateMessage();
  const updateMessage = useUpdateMessageStatus();
  const createTemplate = useCreateTemplate();
  const [form, setForm] = useState({ channel: 'note' as 'note'|'whatsapp'|'email'|'sms', recipient_type: 'person', recipient_id: '', subject: '', body: '', template_id: '' });
  const [tpl, setTpl] = useState({ name: '', channel: 'note' as 'note'|'whatsapp'|'email'|'sms', subject: '', body: '' });

  const recipientOptions = useMemo(() => {
    const r = recipients.data;
    if (!r) return [] as Array<{type:string;id:string;name:string;phone:string|null;email:string|null}>;
    return [
      ...r.people.map((p: any) => ({ type: 'person', id: p.id, name: p.full_name, phone: p.phone, email: p.email })),
      ...r.leads.map((p: any) => ({ type: 'lead', id: p.id, name: p.full_name, phone: p.phone, email: p.email })),
      ...r.owners.map((p: any) => ({ type: 'owner', id: p.id, name: p.full_name, phone: p.phone, email: p.email })),
    ];
  }, [recipients.data]);

  const selectedRecipient = recipientOptions.find((r) => r.id === form.recipient_id && r.type === form.recipient_type);

  return <section className="space-y-4" dir="rtl">
    <h2 className="text-3xl font-black">مركز التواصل</h2>
    <Card><CardHeader><CardTitle>إنشاء رسالة</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 md:grid-cols-6">
        <select className="h-10 rounded-md border px-3" value={form.channel} onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value as any }))}><option value="note">note</option><option value="whatsapp">whatsapp</option><option value="email">email</option><option value="sms">sms</option></select>
        <select className="h-10 rounded-md border px-3" value={form.recipient_type} onChange={(e) => setForm((s) => ({ ...s, recipient_type: e.target.value }))}><option value="person">person</option><option value="lead">lead</option><option value="owner">owner</option></select>
        <select className="h-10 rounded-md border px-3" value={form.recipient_id} onChange={(e) => setForm((s) => ({ ...s, recipient_id: e.target.value }))}><option value="">اختر المستلم</option>{recipientOptions.filter((r) => r.type === form.recipient_type).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select className="h-10 rounded-md border px-3" value={form.template_id} onChange={(e) => { const val=e.target.value; const t=(templates.data ?? []).find((x:any)=>x.id===val); setForm((s)=>({...s, template_id: val, subject: t?.subject ?? s.subject, body: t?.body ?? s.body})); }}><option value="">بدون قالب</option>{(templates.data ?? []).map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <Input placeholder="الموضوع" value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} />
        <Input placeholder="نص الرسالة" value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} />
      </div>
      <Button onClick={() => createMessage.mutate({ channel: form.channel, recipient_type: form.recipient_type, body: form.body, subject: form.subject || null, person_id: form.recipient_type === 'person' ? form.recipient_id : null, lead_id: form.recipient_type === 'lead' ? form.recipient_id : null, owner_id: form.recipient_type === 'owner' ? form.recipient_id : null, recipient_name: selectedRecipient?.name ?? null, recipient_phone: selectedRecipient?.phone ?? null, recipient_email: selectedRecipient?.email ?? null, status: 'queued' })}>إرسال</Button>
      {createMessage.data?.status === 'failed' ? <p className="text-sm text-destructive">الإعدادات غير مكتملة</p> : null}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>القوالب</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 md:grid-cols-5"><Input placeholder="اسم القالب" value={tpl.name} onChange={(e)=>setTpl((s)=>({...s,name:e.target.value}))}/><select className="h-10 rounded-md border px-3" value={tpl.channel} onChange={(e)=>setTpl((s)=>({...s,channel:e.target.value as any}))}><option value="note">note</option><option value="whatsapp">whatsapp</option><option value="email">email</option><option value="sms">sms</option></select><Input placeholder="الموضوع" value={tpl.subject} onChange={(e)=>setTpl((s)=>({...s,subject:e.target.value}))}/><Input placeholder="النص" value={tpl.body} onChange={(e)=>setTpl((s)=>({...s,body:e.target.value}))}/><Button onClick={()=>createTemplate.mutate({name:tpl.name,channel:tpl.channel,subject:tpl.subject||null,body:tpl.body,active:true})}>حفظ قالب</Button></div></CardContent></Card>

    <Card><CardHeader><CardTitle>سجل الرسائل</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3"><select className="h-10 rounded-md border px-3" value={channel} onChange={(e)=>setChannel(e.target.value as any)}><option value="all">كل القنوات</option><option value="note">note</option><option value="whatsapp">whatsapp</option><option value="email">email</option><option value="sms">sms</option></select><select className="h-10 rounded-md border px-3" value={status} onChange={(e)=>setStatus(e.target.value as any)}><option value="all">كل الحالات</option><option value="draft">draft</option><option value="queued">queued</option><option value="sent">sent</option><option value="failed">failed</option></select><Input placeholder="بحث" value={search} onChange={(e)=>setSearch(e.target.value)} /></div>
      <Table><TableHeader><TableRow><TableHead>القناة</TableHead><TableHead>المستلم</TableHead><TableHead>الحالة</TableHead><TableHead>النص</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader><TableBody>{(messages.data ?? []).map((m:any)=><TableRow key={m.id}><TableCell>{m.channel}</TableCell><TableCell>{m.recipient_name ?? '-'}</TableCell><TableCell>{m.status}</TableCell><TableCell className="max-w-[260px] truncate">{m.body}</TableCell><TableCell>{m.status==='failed' ? <Button variant="secondary" onClick={()=>updateMessage.mutate({id:m.id,status:'queued',errorMessage:null})}>إعادة المحاولة</Button> : null}</TableCell></TableRow>)}</TableBody></Table>
    </CardContent></Card>

    {[messages, recipients].some((q)=>q.isError) ? <p className="text-sm text-destructive">{getErrorMessage(messages.error ?? recipients.error, 'تعذر تحميل بيانات التواصل')}</p> : null}
  </section>;
}
