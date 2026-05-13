// Compile-time contract checks for service barrel exports.
import { accountingDocumentEngine, assertDocumentTransition, isLockedDocumentStatus } from '@/services/accountingDocuments';
import { DocumentController, DocumentRenderer, TableGenerator, documentEngine } from '@/services/documents';
import { reportEngine, reportSnapshotManager } from '@/services/reports';
import { adminCreateUser, askAssistant, createOwnerAccessToken, logger, runAutomationScheduler, supabase, verifyOwnerAccessToken } from '@/services';

void accountingDocumentEngine;
void assertDocumentTransition;
void isLockedDocumentStatus;

void documentEngine;
void DocumentController;
void DocumentRenderer;
void TableGenerator;

void reportEngine;
void reportSnapshotManager;

void logger;
void supabase;
void createOwnerAccessToken;
void verifyOwnerAccessToken;
void adminCreateUser;
void askAssistant;
void runAutomationScheduler;
