import React from 'react';

const AlertBar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full bg-yellow-600 text-white py-1 z-[9999] text-center font-mono text-xs">
      <div className="animate-flash flex items-center justify-center space-x-3">
        <span role="img" aria-label="warning">⚠️</span>
        <span>DEMO MODE: TOUCHES WILL RESET MARCH 1, 2025</span>
        <span role="img" aria-label="warning">⚠️</span>
      </div>
      <style jsx global>{`
        @keyframes flash {
          0%, 83.33% {
            opacity: 1;
          }
          83.34%, 100% {
            opacity: 0;
          }
        }
        .animate-flash {
          animation: flash 2s step-end infinite;
        }
      `}</style>
    </div>
  );
};

export default AlertBar; 