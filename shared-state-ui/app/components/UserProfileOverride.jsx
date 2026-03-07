"use client"

import { useState } from "react"
import { ChevronDownIcon, ChevronUpIcon, SlidersHorizontalIcon } from "lucide-react"
import { useSharedStateStore } from "@/app/store/useSharedState"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

export default function UserProfileOverride() {
  const [open, setOpen] = useState(false)
  const userProfile = useSharedStateStore((state) => state.userProfile)
  const updateUserProfile = useSharedStateStore((state) => state.updateUserProfile)

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontalIcon className="h-4 w-4" />
              Accessibility Overrides
            </span>
            {open ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-5 px-4 pb-4">
            {/* Vision */}
            <div className="space-y-1.5">
              <Label htmlFor="vision-select" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Vision
              </Label>
              <Select
                value={userProfile.sensory.vision}
                onValueChange={(value) =>
                  updateUserProfile({ sensory: { vision: value } })
                }
              >
                <SelectTrigger id="vision-select" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="low_vision">Low Vision</SelectItem>
                  <SelectItem value="screen_reader">Screen Reader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label htmlFor="color-select" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Color Mode
              </Label>
              <Select
                value={userProfile.sensory.color}
                onValueChange={(value) =>
                  updateUserProfile({ sensory: { color: value } })
                }
              >
                <SelectTrigger id="color-select" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="high_contrast">High Contrast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Modality */}
            <div className="space-y-1.5">
              <Label htmlFor="modality-select" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Preferred Modality
              </Label>
              <Select
                value={userProfile.interaction.preferredModality}
                onValueChange={(value) =>
                  updateUserProfile({ interaction: { preferredModality: value } })
                }
              >
                <SelectTrigger id="modality-select" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Inputs Per Step */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Max Inputs Per Step:{" "}
                <span className="font-normal normal-case">
                  {userProfile.cognitive.maxInputsPerStep ?? "Unlimited"}
                </span>
              </Label>
              <Slider
                aria-label="Max inputs per step"
                min={1}
                max={10}
                step={1}
                value={[userProfile.cognitive.maxInputsPerStep ?? 10]}
                onValueChange={([value]) =>
                  updateUserProfile({
                    cognitive: { maxInputsPerStep: value === 10 ? null : value },
                  })
                }
              />
            </div>

            {/* Safe Mode */}
            <div className="flex items-center justify-between">
              <Label htmlFor="safe-mode-switch" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Safe Mode
              </Label>
              <Switch
                id="safe-mode-switch"
                checked={userProfile.cognitive.safeMode}
                onCheckedChange={(checked) =>
                  updateUserProfile({ cognitive: { safeMode: checked } })
                }
              />
            </div>

            {/* Decision Support */}
            <div className="flex items-center justify-between">
              <Label htmlFor="decision-support-switch" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Decision Support
              </Label>
              <Switch
                id="decision-support-switch"
                checked={userProfile.cognitive.requiresDecisionSupport}
                onCheckedChange={(checked) =>
                  updateUserProfile({
                    cognitive: { requiresDecisionSupport: checked },
                  })
                }
              />
            </div>

            {/* Progressive Disclosure */}
            <div className="flex items-center justify-between">
              <Label htmlFor="progressive-disclosure-switch" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Progressive Disclosure
              </Label>
              <Switch
                id="progressive-disclosure-switch"
                checked={userProfile.interaction.progressiveDisclosure}
                onCheckedChange={(checked) =>
                  updateUserProfile({
                    interaction: { progressiveDisclosure: checked },
                  })
                }
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
