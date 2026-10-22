import Image from 'next/image';
import Link from 'next/link';

export default function BrandLogo({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" className={`brand-logo-link ${className}`} aria-label="Dyvnn Store">
      <Image src="/brand/logo.png" alt="Dyvnn Store" width={160} height={100} priority={priority} sizes="160px" />
    </Link>
  );
}
