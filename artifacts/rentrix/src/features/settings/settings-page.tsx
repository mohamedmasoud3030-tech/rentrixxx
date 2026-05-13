import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUiStore } from '@/store/ui-store';

export function SettingsPage() {
  const { theme, setTheme } = useUiStore();
  const [company, setCompany] = useState({ name: 'Rentrix', logo: '', address: '', phone: '' });
  const [users, setUsers] = useState<{ email: string; active: boolean }[]>([{ email: 'admin@rentrix.app', active: true }]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  return <div className='grid gap-4 lg:grid-cols-2' dir='rtl'>
    <Card><CardHeader><CardTitle>ملف الشركة</CardTitle></CardHeader><CardContent className='space-y-2'>
      <input className='w-full rounded border px-2 py-2' placeholder='الاسم' value={company.name} onChange={(e)=>setCompany({...company,name:e.target.value})}/>
      <input className='w-full rounded border px-2 py-2' placeholder='رابط الشعار' value={company.logo} onChange={(e)=>setCompany({...company,logo:e.target.value})}/>
      <input className='w-full rounded border px-2 py-2' placeholder='العنوان' value={company.address} onChange={(e)=>setCompany({...company,address:e.target.value})}/>
      <input className='w-full rounded border px-2 py-2' placeholder='الهاتف' value={company.phone} onChange={(e)=>setCompany({...company,phone:e.target.value})}/>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>إدارة المستخدمين</CardTitle><CardDescription>دعوة عبر البريد أو تعطيل مستخدم.</CardDescription></CardHeader><CardContent className='space-y-2'>
      <div className='flex gap-2'><input className='flex-1 rounded border px-2 py-2' placeholder='email@example.com' value={inviteEmail} onChange={(e)=>setInviteEmail(e.target.value)}/><Button onClick={() => { if (!inviteEmail) return; setUsers((v)=>[{email:inviteEmail,active:true},...v]); setInviteEmail(''); }}>دعوة</Button></div>
      {users.map((u) => <div key={u.email} className='flex items-center justify-between rounded border p-2'><span>{u.email}</span><Button variant='secondary' onClick={() => setUsers((v)=>v.map((x)=>x.email===u.email?{...x,active:!x.active}:x))}>{u.active ? 'تعطيل' : 'تفعيل'}</Button></div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>تفضيلات التطبيق</CardTitle></CardHeader><CardContent className='space-y-3'>
      <div className='flex gap-2'><Button variant={lang==='ar'?'primary':'secondary'} onClick={()=>setLang('ar')}>AR</Button><Button variant={lang==='en'?'primary':'secondary'} onClick={()=>setLang('en')}>EN</Button></div>
      <Button variant='secondary' onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>تبديل السمة ({theme})</Button>
    </CardContent></Card>
  </div>;
}
