import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEnvDiagnostics, parseSupabaseDiagnostics } from '@/lib/runtime-diagnostics';

type DataErrorScreenProps = {
  title: string;
  fallbackMessage: string;
  error?: unknown;
};

export function DataErrorScreen({ title, fallbackMessage, error }: Readonly<DataErrorScreenProps>) {
  const diagnostics = [...getEnvDiagnostics(), ...parseSupabaseDiagnostics(error)];

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-5" />{title}</CardTitle>
        <CardDescription>{diagnostics[0]?.messageAr ?? fallbackMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <details className="rounded-xl border border-destructive/30 bg-background/70 p-3">
          <summary className="cursor-pointer font-bold text-destructive">تفاصيل تشخيصية تقنية</summary>
          <ul className="mt-3 list-disc space-y-2 pr-5 text-muted-foreground">
            {diagnostics.map((item) => <li key={`${item.code}-${item.technical}`}>{item.technical}</li>)}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
