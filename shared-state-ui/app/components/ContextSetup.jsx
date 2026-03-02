'use client';

import { useState } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContextSetup() {
  const [localContext, setLocalContext] = useState('');
  const setSystemContext = useSharedStateStore((state) => state.setSystemContext);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'text/plain') {
      alert('Seleziona un file .txt valido.');
      e.target.value = '';
      return;
    }
    const MAX_SIZE = 512 * 1024; // 512 KB
    if (file.size > MAX_SIZE) {
      alert('Il file è troppo grande. Dimensione massima: 512 KB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLocalContext(event.target.result);
    };
    reader.onerror = () => {
      alert('Errore durante la lettura del file.');
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    setSystemContext(localContext);
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Inizializzazione del Contesto</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium mb-1">
            Carica file .txt
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
          />
        </div>
        <div>
          <label htmlFor="context-textarea" className="block text-sm font-medium mb-1">
            Oppure incolla il testo del contesto
          </label>
          <Textarea
            id="context-textarea"
            value={localContext}
            onChange={(e) => setLocalContext(e.target.value)}
            placeholder="Incolla qui la cronologia della conversazione o il contesto..."
            rows={10}
          />
        </div>
        <Button onClick={handleSave} disabled={!localContext.trim()}>
          Salva Contesto
        </Button>
      </CardContent>
    </Card>
  );
}
