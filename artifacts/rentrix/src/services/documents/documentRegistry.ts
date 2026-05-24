import type { DocumentTemplateKey, DocumentRenderModel } from './documentTypes';
import { buildOwnersTemplate } from './templates/ownersTemplate';
import { buildPropertiesTemplate } from './templates/propertiesTemplate';
import { buildInvoicesTemplate } from './templates/invoicesTemplate';
import { buildContractsTemplate } from './templates/contractsTemplate';
import { buildReceiptTemplate } from './templates/receiptsTemplate';
import { buildArrearsTemplate } from './templates/arrearsTemplate';

export type TemplateBuilder = (data: unknown) => DocumentRenderModel;

export const documentRegistry: Record<DocumentTemplateKey, TemplateBuilder> = {
  'owners-report': (data) => buildOwnersTemplate(data as Parameters<typeof buildOwnersTemplate>[0]),
  'properties-report': (data) => buildPropertiesTemplate(data as Parameters<typeof buildPropertiesTemplate>[0]),
  'invoices-report': (data) => buildInvoicesTemplate(data as Parameters<typeof buildInvoicesTemplate>[0]),
  'contracts-report': (data) => buildContractsTemplate(data as Parameters<typeof buildContractsTemplate>[0]),
  receipt: (data) => buildReceiptTemplate(data as Parameters<typeof buildReceiptTemplate>[0]),
  'arrears-report': (data) => buildArrearsTemplate(data as Parameters<typeof buildArrearsTemplate>[0]),
};
