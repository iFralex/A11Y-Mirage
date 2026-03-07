'use client';

import { useState } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { processWithGemini } from '@/app/actions/processUserInput';

const ACCESSIBILITY_ONBOARDING_CONTEXT = `You are an accessibility onboarding agent. Ask the user one question at a time to determine their visual, cognitive, and motor needs. Ask about voice synthesis, contrast, need for detailed explanations, and safe mode. Use simple inputs (boolean_confirm, select_option). End the workflow when you have enough data.

CRITICAL: Set taskType to "accessibility_onboarding" in every response.

Use these exact input IDs (do not deviate):
- Visual impairment level: input ID "sensory_vision", type select_option, options: ["default", "screen_reader", "low_vision"]
- Color/contrast preference: input ID "sensory_color", type select_option, options: ["default", "high_contrast"]
- Max inputs per step (cognitive load): input ID "cognitive_maxInputsPerStep", type number_input
- Needs decision support: input ID "cognitive_requiresDecisionSupport", type boolean_confirm
- Safe mode (double-confirm actions): input ID "cognitive_safeMode", type boolean_confirm
- Preferred interaction modality: input ID "interaction_preferredModality", type select_option, options: ["visual", "voice", "hybrid"]
- Progressive disclosure of explanations: input ID "interaction_progressiveDisclosure", type boolean_confirm`;

export default function ContextSetup() {
  const [localContext, setLocalContext] = useState('');
  const setSystemContext = useSharedStateStore((state) => state.setSystemContext);
  const addStep = useSharedStateStore((state) => state.addStep);
  const setLoading = useSharedStateStore((state) => state.setLoading);
  const setError = useSharedStateStore((state) => state.setError);
  const setEstimatedSteps = useSharedStateStore((state) => state.setEstimatedSteps);

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

  const handleStartAccessibilityOnboarding = async () => {
    setSystemContext(ACCESSIBILITY_ONBOARDING_CONTEXT);
    setLoading(true);
    try {
      const emptyWorkflow = { taskId: null, taskName: '', steps: [] };
      const firstStep = await processWithGemini('Start', ACCESSIBILITY_ONBOARDING_CONTEXT, emptyWorkflow);
      addStep(firstStep);
      setEstimatedSteps(firstStep.estimatedRemainingSteps);
    } catch (err) {
      setError(err.message || 'Failed to start accessibility onboarding.');
    } finally {
      setLoading(false);
    }
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
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Alternatively, set up your accessibility preferences automatically:
          </p>
          <Button
            variant="outline"
            onClick={handleStartAccessibilityOnboarding}
          >
            Create Accessibility Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
