import { AlertTriangle } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEnvDiagnostics, parseSupabaseDiagnostics } from '@/lib/runtime-diagnostics';

type DataErrorScreenProps = {
  title: string;
  fallbackMessage: string;
  error?: unknown;
};

export function DataErrorScreen({ title, fallbackMessage, error }: DataErrorScreenProps) {
  const diagnostics = [...getEnvDiagnostics(), ...parseSupabaseDiagnostics(error)];

  return (
    <Card className="border-destructive/40 bg-destructive/5" role="alert" aria-live="assertive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-5" />{title}</CardTitle>
        <CardDescription>{diagnostics[0]?.messageAr ?? fallbackMessage}</CardDescription>
      </CardHeader>
    </Card>
  );
}
