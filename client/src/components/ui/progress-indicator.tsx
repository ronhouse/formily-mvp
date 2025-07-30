interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function ProgressIndicator({ currentStep, totalSteps, steps }: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index + 1 <= currentStep 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                index + 1 <= currentStep 
                  ? 'text-primary' 
                  : 'text-gray-600'
              }`}>
                {step}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div className="w-12 h-0.5 bg-gray-300 ml-4"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
