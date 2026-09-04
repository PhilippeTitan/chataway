'use client'

export default function SunsetBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep Earth / Warm Wood Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#140e0a] via-[#1a120c] to-[#0c0805]" />

      {/* Subtle Warm Photographic Texture */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity filter blur-[2px] scale-105"
        style={{ backgroundImage: "url('/images/sunset-terrace.jpg')" }}
      />

      {/* Main Sunset Golden Glow Orb */}
      <div
        className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[720px] h-[520px] md:w-[980px] md:h-[640px] rounded-full opacity-65 blur-[130px] animate-sunset-glow"
        style={{
          background:
            'radial-gradient(circle, rgba(234, 88, 12, 0.45) 0%, rgba(217, 119, 6, 0.35) 45%, rgba(120, 53, 15, 0.2) 75%, transparent 100%)',
        }}
      />

      {/* Warm Afternoon Breeze Drifting Orb (Left) */}
      <div
        className="absolute top-[35%] -left-[10%] w-[500px] h-[500px] md:w-[680px] md:h-[680px] rounded-full opacity-45 blur-[140px] animate-breeze"
        style={{
          background:
            'radial-gradient(circle, rgba(180, 83, 9, 0.35) 0%, rgba(154, 52, 18, 0.25) 50%, transparent 100%)',
        }}
      />

      {/* Warm Sandstone & Dusk Light Orb (Right / Lower) */}
      <div
        className="absolute -bottom-[10%] -right-[5%] w-[550px] h-[550px] md:w-[720px] md:h-[720px] rounded-full opacity-50 blur-[150px] animate-breeze-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(212, 163, 115, 0.28) 0%, rgba(120, 53, 15, 0.3) 55%, transparent 100%)',
        }}
      />

      {/* Subtle Warm Horizon Light Streak */}
      <div
        className="absolute top-[45%] left-0 right-0 h-[1px] opacity-25"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(245, 235, 224, 0.15) 30%, rgba(234, 88, 12, 0.35) 50%, rgba(245, 235, 224, 0.15) 70%, transparent 100%)',
        }}
      />

      {/* Vignette edge shading */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,7,5,0.75)_100%)]" />
    </div>
  )
}
