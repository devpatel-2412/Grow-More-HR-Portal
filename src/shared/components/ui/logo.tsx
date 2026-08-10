import lightThemeLogo from '../../../assets/light-theme-logo.webp';
import darkThemeLogo from '../../../assets/dark-theme-logo.webp';
import { APP_NAME } from '../../config/brand';
import { cn } from '../../utils/cn';
import { useTheme } from '../../lib/theme';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const { theme } = useTheme();
  const logoSrc = theme === 'light' ? lightThemeLogo : darkThemeLogo;
  return <img src={logoSrc} alt={`${APP_NAME} logo`} className={cn('object-contain', className)} />;
}
