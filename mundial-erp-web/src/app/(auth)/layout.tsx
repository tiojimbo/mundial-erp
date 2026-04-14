export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className='relative h-screen w-screen overflow-hidden'
      style={{
        background:
          'linear-gradient(180deg, #76a91a 0%, #76a91a 25%, #8cb541 50%, #91ac60 75%, #d6f3a3 100%)',
      }}
    >
      {children}
    </div>
  );
}
