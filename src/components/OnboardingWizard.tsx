import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOnboardingStore } from "@/store/onboarding-store";
import { processOnboardingAnswers } from "@/lib/onboarding-processor";
import { useToggleStore } from "@/store/toggle-store";
import { useLayoutStore } from "@/store/layout-store";
import type { PanelConfig } from "@/types/panel";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface StepDef {
  key: string;
  prompt: string;
  subtext: string;
  placeholder: string;
  optional?: boolean;
}

const STEPS: StepDef[] = [
  {
    key: "projectType",
    prompt: "What are you building?",
    subtext:
      "A web app, API, CLI tool, data pipeline... anything goes. This helps me set up the right workspace.",
    placeholder: 'e.g. "A React dashboard with a Node backend"',
  },
  {
    key: "workStyle",
    prompt: "How do you like to work?",
    subtext:
      "Minimal and focused? Everything visible at once? Somewhere in between?",
    placeholder: 'e.g. "I like a clean workspace with just the essentials"',
  },
  {
    key: "existingTools",
    prompt: "What tools do you already use?",
    subtext:
      "Git, Docker, Figma, Jira, VS Code... I can suggest integrations for your stack.",
    placeholder: 'e.g. "Git, GitHub, Docker, VS Code"',
  },
  {
    key: "freeform",
    prompt: "Anything else I should know?",
    subtext:
      "Preferences, pet peeves, favorite shortcuts -- totally optional.",
    placeholder: "Type anything or press Enter to skip",
    optional: true,
  },
];

// ---------------------------------------------------------------------------
// ProgressDots
// ---------------------------------------------------------------------------

const ProgressDots: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => (
  <div className="onboarding-progress">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`onboarding-progress__dot${
          i === current
            ? " onboarding-progress__dot--active"
            : i < current
              ? " onboarding-progress__dot--done"
              : ""
        }`}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// OnboardingWizard
// ---------------------------------------------------------------------------

const OnboardingWizard: React.FC = () => {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const totalSteps = useOnboardingStore((s) => s.totalSteps);
  const answers = useOnboardingStore((s) => s.answers);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setAnswer = useOnboardingStore((s) => s.setAnswer);
  const complete = useOnboardingStore((s) => s.complete);
  const skip = useOnboardingStore((s) => s.skip);
  const start = useOnboardingStore((s) => s.start);

  const setActiveProfile = useToggleStore((s) => s.setActiveProfile);
  const setTogglesForWorkspace = useToggleStore(
    (s) => s.setTogglesForWorkspace,
  );
  const activeWorkspace = useToggleStore((s) => s.activeWorkspace);
  const setPanels = useLayoutStore((s) => s.setPanels);

  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  // Start the timer once on mount
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  // Auto-focus input when step changes
  useEffect(() => {
    // Small delay lets the CSS transition finish before focus
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [currentStep]);

  // Populate input from existing answer when navigating back
  useEffect(() => {
    const step = STEPS[currentStep];
    if (!step) return;
    if (step.key === "existingTools") {
      setInputValue(answers.existingTools.join(", "));
    } else {
      const val = answers[step.key as keyof typeof answers];
      setInputValue(typeof val === "string" ? val : "");
    }
  }, [currentStep, answers]);

  const saveCurrentAnswer = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step) return;
    const trimmed = inputValue.trim();
    if (step.key === "existingTools") {
      setAnswer(
        "existingTools",
        trimmed
          ? trimmed.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      );
    } else if (step.key === "projectType" || step.key === "workStyle" || step.key === "freeform") {
      setAnswer(step.key, trimmed || null);
    }
  }, [currentStep, inputValue, setAnswer]);

  const handleNext = useCallback(() => {
    saveCurrentAnswer();
    if (currentStep < totalSteps - 1) {
      nextStep();
      setInputValue("");
    } else {
      // Final step -- process answers and apply configuration
      const result = processOnboardingAnswers(
        useOnboardingStore.getState().answers,
      );

      setActiveProfile(result.profile);
      setTogglesForWorkspace(activeWorkspace, result.toggles);

      // Convert layout to PanelConfig[]
      const panels: PanelConfig[] = result.layout.map((p) => ({
        ...p,
        title:
          p.type.charAt(0).toUpperCase() + p.type.slice(1),
      }));
      setPanels(panels);

      complete();
    }
  }, [
    saveCurrentAnswer,
    currentStep,
    totalSteps,
    nextStep,
    complete,
    setActiveProfile,
    setTogglesForWorkspace,
    activeWorkspace,
    setPanels,
  ]);

  const handleBack = useCallback(() => {
    saveCurrentAnswer();
    prevStep();
  }, [saveCurrentAnswer, prevStep]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
    },
    [handleNext],
  );

  const handleSkip = useCallback(() => {
    skip();
  }, [skip]);

  const step = STEPS[currentStep];
  if (!step) return null;

  const isLast = currentStep === totalSteps - 1;
  const canSkipStep = step.optional && !inputValue.trim();

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        {/* Skip button */}
        <button
          className="onboarding-wizard__skip"
          onClick={handleSkip}
          type="button"
        >
          Skip setup
        </button>

        {/* Progress */}
        <ProgressDots current={currentStep} total={totalSteps} />

        {/* Conversational prompt */}
        <div className="onboarding-wizard__content" key={currentStep}>
          <h2 className="onboarding-wizard__prompt">{step.prompt}</h2>
          <p className="onboarding-wizard__subtext">{step.subtext}</p>

          <input
            ref={inputRef}
            className="onboarding-wizard__input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={step.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Navigation */}
        <div className="onboarding-wizard__nav">
          {currentStep > 0 && (
            <button
              className="onboarding-wizard__btn onboarding-wizard__btn--back"
              onClick={handleBack}
              type="button"
            >
              Back
            </button>
          )}
          <button
            className="onboarding-wizard__btn onboarding-wizard__btn--next"
            onClick={handleNext}
            type="button"
          >
            {isLast
              ? "Finish"
              : canSkipStep
                ? "Skip"
                : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OnboardingWizard);
