/**
 * Backup & Restore Page
 * User interface for manual backup/restore and settings
 */

import React, { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useTransactionStore } from '../src/store';
import {
  createBackupData,
  downloadBackup,
  parseBackupFile,
  restoreFromBackup,
  shouldBackupToday,
  BackupData,
} from '../services/autoBackup';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent } from './ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';

interface BackupPageProps {
  onNavigate?: (page: string) => void;
}

export const BackupPage: React.FC<BackupPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('backup');
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transactions = useTransactionStore((state) => state.transactions);
  const hovedkategorier = useTransactionStore((state) => state.hovedkategorier);
  const underkategorier = useTransactionStore((state) => state.underkategorier);
  const rules = useTransactionStore((state) => state.rules);

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Manual export
  const handleManualExport = () => {
    try {
      const backupData = createBackupData();
      downloadBackup(backupData);
      setMessage({
        type: 'success',
        text: `✅ Backup lastet ned! ${backupData.metadata.transactionCount} transaksjoner eksportert.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Eksport feilet: ${error instanceof Error ? error.message : 'Ukjent feil'}`,
      });
    }
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setMessage(null);

    if (!file.name.endsWith('.json')) {
      setMessage({
        type: 'error',
        text: '❌ Ugyldig filtype. Kun .json filer er støttet.',
      });
      return;
    }

    try {
      const result = await parseBackupFile(file);

      if (!result.success || !result.data) {
        setMessage({
          type: 'error',
          text: `❌ Kunne ikke lese fil: ${result.error}`,
        });
        return;
      }

      setPreviewData(result.data);
      setShowConfirmDialog(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Fil-parsing feilet: ${error instanceof Error ? error.message : 'Ukjent feil'}`,
      });
    }
  };

  // File input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Confirm restore
  const handleConfirmRestore = () => {
    if (!previewData) return;

    const result = restoreFromBackup(previewData);

    if (result.success) {
      setMessage({
        type: 'success',
        text: `✅ Data gjenopprettet! ${previewData.metadata.transactionCount} transaksjoner importert.`,
      });
    } else {
      setMessage({
        type: 'error',
        text: `❌ Gjenoppretting feilet: ${result.error}`,
      });
    }

    setShowConfirmDialog(false);
    setPreviewData(null);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cancel restore
  const handleCancelRestore = () => {
    setShowConfirmDialog(false);
    setPreviewData(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const lastBackupDate = typeof window !== 'undefined' 
    ? localStorage.getItem('last-backup-date') 
    : null;

  const needsBackup = shouldBackupToday();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Backup & Gjenoppretting</h1>
            <p className="text-gray-600 mt-2">
              Sikkerhetskopier og gjenopprett dine transaksjonsdata
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : message.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {message.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {message.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {message.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Auto Backup Status */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Automatisk backup</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span
                    className={`font-semibold ${
                      needsBackup ? 'text-orange-600' : 'text-green-600'
                    }`}
                  >
                    {needsBackup ? '⚠️ Backup påkrevd' : '✅ Backup utført i dag'}
                  </span>
                </div>
                {lastBackupDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Siste backup:</span>
                    <span className="font-medium">{lastBackupDate}</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-4">
                  ℹ️ Appen laster automatisk ned en backup-fil første gang du åpner den hver dag
                  (hvis du har data). Filen lastes ned til din nedlastningsmappe.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Data Stats */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Nåværende data</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {transactions.length.toLocaleString('no')}
                  </div>
                  <div className="text-sm text-blue-700">Transaksjoner</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {(hovedkategorier.size + underkategorier.size).toLocaleString('no')}
                  </div>
                  <div className="text-sm text-green-700">Kategorier</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {rules.size.toLocaleString('no')}
                  </div>
                  <div className="text-sm text-purple-700">Regler</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-900">
                    {transactions.filter((t) => t.categoryId).length.toLocaleString('no')}
                  </div>
                  <div className="text-sm text-orange-700">Kategoriserte</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Export */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Eksporter backup
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Last ned en sikkerhetskopi av alle dine data som en JSON-fil.
                </p>
                <Button onClick={handleManualExport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Last ned backup nå
                </Button>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Backup inneholder:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Alle transaksjoner</li>
                    <li>Kategorier og underkategorier</li>
                    <li>Kategoriseringsregler</li>
                    <li>Låste transaksjoner</li>
                    <li>Budsjetter</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Import */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Importer backup
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Gjenopprett data fra en tidligere sikkerhetskopi.
                </p>

                {/* Drag & Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-700 font-medium mb-2">
                    Dra og slipp fil her
                  </p>
                  <p className="text-gray-500 text-sm mb-4">eller</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="file-input"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Velg fil
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Advarsel:</strong> Import vil erstatte alle nåværende data.
                      Sørg for å eksportere en backup først!
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">📚 Instruksjoner</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h3 className="font-semibold mb-2">Automatisk daglig backup:</h3>
                  <p>
                    Første gang du åpner appen hver dag (hvis du har data), lastes en backup-fil
                    automatisk ned til din nedlastningsmappe med navn{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded">
                      transaction-backup-YYYY-MM-DD.json
                    </code>
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Manuell backup:</h3>
                  <p>
                    Klikk på "Last ned backup nå" for å laste ned en backup når som helst.
                    Lagre filen på et sikkert sted (f.eks. Dropbox, OneDrive, ekstern disk).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Gjenopprette fra backup:</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Dra og slipp backup-filen eller klikk "Velg fil"</li>
                    <li>Forhåndsvis innholdet i filen</li>
                    <li>Bekreft at du vil erstatte nåværende data</li>
                    <li>Data gjenopprettes automatisk</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft gjenoppretting</AlertDialogTitle>
            <AlertDialogDescription>
              {previewData && (
                <div className="space-y-3 mt-4">
                  <p className="font-medium text-gray-900">
                    Vil du gjenopprette data fra denne backupen?
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Backup-dato:</span>
                      <span className="font-medium">
                        {new Date(previewData.backupDate).toLocaleString('no')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaksjoner:</span>
                      <span className="font-medium">
                        {previewData.metadata.transactionCount.toLocaleString('no')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kategorier:</span>
                      <span className="font-medium">
                        {previewData.metadata.categoryCount.toLocaleString('no')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Regler:</span>
                      <span className="font-medium">
                        {previewData.metadata.ruleCount.toLocaleString('no')}
                      </span>
                    </div>
                  </div>
                  <p className="text-red-600 font-medium">
                    ⚠️ Dette vil erstatte alle nåværende data!
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRestore}>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>
              Ja, gjenopprett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BackupPage;

