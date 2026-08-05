import logoSrc from '../../../assets/logo.be463891.png';
import { APP_NAME } from '../../config/brand';
import { cn } from '../../utils/cn';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return <img src={logoSrc} alt={`${APP_NAME} logo`} className={cn('rounded-lg object-contain', className)} />;
}
