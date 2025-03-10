import React from 'react';

const AlertBar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full bg-green-600 text-white py-1 z-[9999] text-center font-mono text-xs">
      <div className="animate-flash flex items-center justify-center space-x-3">
        <span role="img" aria-label="party">🎉</span>
        <span>CONTEST LIVE!</span>
        <span role="img" aria-label="party">🎉</span>
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