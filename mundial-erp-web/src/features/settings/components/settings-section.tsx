type SettingsSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className='grid grid-cols-1 gap-8 border-b border-stroke-soft-200 py-8 first:pt-0 lg:grid-cols-[minmax(0,400px)_1fr]'>
      <div>
        <h2 className='text-label-md font-semibold text-text-strong-950'>
          {title}
        </h2>
        <p className='mt-1 text-paragraph-sm text-text-sub-600'>
          {description}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}
