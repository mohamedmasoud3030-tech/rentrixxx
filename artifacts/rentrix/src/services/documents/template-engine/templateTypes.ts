import type { DocumentRenderModel } from '../documentTypes';

export type TemplateModel = DocumentRenderModel;
export type TemplateBuilder<TData> = (data: TData) => TemplateModel;
