"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SetupProgress } from "@/components/onboarding/setup-progress";
import { StepCompanyInfo } from "@/components/onboarding/step-company-info";
import { StepWorkPolicy } from "@/components/onboarding/step-work-policy";
import { StepOrganization } from "@/components/onboarding/step-organization";
import { StepInvite } from "@/components/onboarding/step-invite";

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function handleComplete() {
    router.push("/dashboard");
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          T
        </div>
        <h1 className="text-2xl font-bold">회사 초기 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          타운을 시작하기 위한 기본 정보를 설정해주세요
        </p>
      </div>
      <SetupProgress currentStep={currentStep} />
      {currentStep === 0 && <StepCompanyInfo onNext={handleNext} />}
      {currentStep === 1 && <StepWorkPolicy onNext={handleNext} onBack={handleBack} />}
      {currentStep === 2 && <StepOrganization onNext={handleNext} onBack={handleBack} />}
      {currentStep === 3 && <StepInvite onComplete={handleComplete} onBack={handleBack} />}
    </>
  );
}
