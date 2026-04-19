/**
 * Layout do route group (public) — telas pos-login porem fora do shell
 * principal do dashboard. Ex: onboarding de workspace inexistente.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen w-full bg-bg-white-0 text-text-strong-950'>
      {children}
    </div>
  );
}
