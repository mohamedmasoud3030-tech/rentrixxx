import { Button } from '@/components/ui/button';

type QuickPaymentFormProps = {
  amount: string;
  amountValidationMessage: string;
  isPending: boolean;
  isPaymentDisabled: boolean;
  onAmountChange: (amount: string) => void;
  onPostPayment: () => void;
};

export function QuickPaymentForm({ amount, amountValidationMessage, isPending, isPaymentDisabled, onAmountChange, onPostPayment }: QuickPaymentFormProps) {
  return (
    <div className="rounded-2xl border p-4">
      <h4 className="font-black">تسجيل دفعة سريعة</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <input className="min-h-10 w-full rounded-xl border bg-background px-3 text-sm" type="number" min="0.01" step="0.01" placeholder="المبلغ" value={amount} onChange={(event) => onAmountChange(event.target.value)} />
          {amountValidationMessage ? <p className="mt-2 text-sm text-destructive">{amountValidationMessage}</p> : null}
        </div>
        <Button onClick={onPostPayment} disabled={isPaymentDisabled}>{isPending ? 'جارٍ التسجيل...' : 'تسجيل دفعة'}</Button>
      </div>
    </div>
  );
}
