import { FileText, LockKeyhole } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

type ContractDocumentSlot = Readonly<{
  label: string;
  note: string;
}>;

const contractDocumentSlots: readonly ContractDocumentSlot[] = [
  { label: 'نسخة العقد الموقعة', note: 'مرجع للنسخة الموقعة عند توفر خدمة المستندات.' },
  { label: 'هوية المستأجر', note: 'موضع تعريفي فقط دون رفع أو تخزين جديد.' },
  { label: 'ملاحق العقد', note: 'غلاف للملاحق المستقبلية دون توليد PDF.' },
];

const documentSlotClass = 'flex min-h-28 gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm';
const shellScopeCopy = 'لا توجد إجراءات رفع، حذف، طباعة، إنشاء إيصالات، أو تكامل تخزين ضمن هذا النطاق.';

export function ContractDocumentsShell({ contractId }: Readonly<{ contractId: string }>) {
  const documentReference = `#${contractId.slice(0, 8)}`;

  return (
    <Card className="overflow-hidden border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="bg-background/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" />تبويب مستندات العقد</CardTitle>
            <CardDescription>غلاف قراءة فقط لملفات العقد المستقبلية دون PDF أو جداول جديدة.</CardDescription>
          </div>
          <StatusBadge tone="gray"><LockKeyhole className="me-1 size-3" />قراءة فقط</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <ol className="grid gap-3 md:grid-cols-3">
          {contractDocumentSlots.map((slot) => (
            <li className={documentSlotClass} key={slot.label}>
              <FileText className="mt-1 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-black">{slot.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{slot.note}</p>
                <p className="mt-3 text-xs font-bold text-muted-foreground">مرجع العقد: {documentReference}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="rounded-2xl border border-border bg-background p-4 text-sm leading-7 text-muted-foreground">
          هذا التبويب مرتبط بالعقد الحالي فقط: {documentReference}. {shellScopeCopy}
        </p>
      </CardContent>
    </Card>
  );
}
