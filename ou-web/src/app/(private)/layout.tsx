import { OUAppShell } from '@/components/ui/OUAppShell';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <OUAppShell>{children}</OUAppShell>;
}
