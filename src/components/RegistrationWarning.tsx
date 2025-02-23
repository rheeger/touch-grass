import { Tooltip } from './Tooltip';
import { getRegistrationUrl } from '@/utils/registration';

interface RegistrationWarningProps {
  className?: string;
}

export function RegistrationWarning({ className = '' }: RegistrationWarningProps) {
  return (
    <Tooltip content={
      <div>
        Ante-up before March 1st to be able to participate!{' '}
        <a 
          href={getRegistrationUrl()} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Visit commit.wtf
        </a> to register.
      </div>
    }>
      <div className={`inline-block text-yellow-500 hover:text-yellow-400 transition-colors cursor-help ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 inline">
          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      </div>
    </Tooltip>
  );
} 