interface StepperProps {
  steps: string[];
  currentIndex: number;
  onStepClick?: (step: string, index: number) => void;
}

export default function Stepper({ steps, currentIndex, onStepClick }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, idx) => (
        <div key={step} className="stepper-item">
          <div className="stepper-node">
            <button
              type="button"
              className={`stepper-dot${idx < currentIndex ? ' done' : idx === currentIndex ? ' active' : ''}`}
              onClick={() => onStepClick && onStepClick(step, idx)}
              title={step}
            >
              {idx + 1}
            </button>
            <span className={`stepper-node-label${idx === currentIndex ? ' active' : ''}`}>{step}</span>
          </div>
          {idx < steps.length - 1 && <div className={`stepper-line${idx < currentIndex ? ' done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}
