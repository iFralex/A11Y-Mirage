'use client';

import { useRef, useEffect, useState } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';
import DynamicTaskRenderer from '@/app/components/DynamicTaskRenderer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function DynamicTaskContainer() {
  const taskData = useSharedStateStore((state) => state.taskData);
  const isLoading = useSharedStateStore((state) => state.isLoading);
  const error = useSharedStateStore((state) => state.error);

  const titleRef = useRef(null);
  const [userResponse, setUserResponse] = useState(null);

  useEffect(() => {
    if (taskData && !isLoading && !error) {
      titleRef.current?.focus();
    }
  }, [taskData, isLoading, error]);

  const handleConferma = () => {
    console.log('Conferma clicked. Task:', taskData?.taskType, 'User response:', userResponse);
  };

  return (
    <div
      role="region"
      aria-labelledby={taskData ? 'task-title' : undefined}
      aria-label={taskData ? undefined : 'Sezione task AI'}
      className="max-w-2xl mx-auto mt-6"
    >
      <div aria-live="assertive" className="sr-only">
        {isLoading ? 'Elaborazione in corso...' : ''}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10" aria-hidden="true">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-700" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {taskData && (
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-4">
          <h2
            id="task-title"
            tabIndex="-1"
            ref={titleRef}
            className="text-xl font-semibold tracking-tight outline-none"
          >
            Task: {taskData.taskType}
          </h2>
          <p className="text-muted-foreground text-sm">{taskData.stateSummary}</p>
          <DynamicTaskRenderer
            key={taskData.taskId}
            pendingAction={taskData.pendingAction}
            onResponseChange={setUserResponse}
          />
          <Button onClick={handleConferma} className="self-start mt-2">
            Conferma
          </Button>
        </div>
      )}
    </div>
  );
}
