const base = import.meta.env.BASE_URL;

export default function Slide01_Title() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0C1520 0%, #0F1D35 55%, #0C1520 100%)" }}
    >
      {/* Right panel — hero image */}
      <div
        className="absolute top-0 right-0 h-full"
        style={{ width: "45vw" }}
      >
        <img
          src={`${base}hero.png`}
          crossOrigin="anonymous"
          alt="Luxury property"
          className="w-full h-full object-cover"
          style={{ opacity: 0.7 }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, #0C1520 0%, transparent 40%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #0C152088 0%, transparent 30%, transparent 70%, #0C1520cc 100%)" }}
        />
      </div>

      {/* Horizontal gold rule — top */}
      <div
        className="absolute"
        style={{ top: "8vh", left: "8vw", width: "30vw", height: "1px", background: "linear-gradient(90deg, #B8860B, transparent)" }}
      />

      {/* Horizontal gold rule — bottom */}
      <div
        className="absolute"
        style={{ bottom: "8vh", left: "8vw", width: "30vw", height: "1px", background: "linear-gradient(90deg, #B8860B, transparent)" }}
      />

      {/* Left content block */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: 0, left: "8vw", width: "50vw", height: "100vh" }}
      >
        {/* Label */}
        <div
          className="font-display font-semibold tracking-[0.4em] text-primary"
          style={{ fontSize: "1.2vw", marginBottom: "3.5vh", textTransform: "uppercase" }}
        >
          Property Management Platform
        </div>

        {/* Main wordmark */}
        <div
          className="font-display font-black text-text tracking-tighter"
          style={{ fontSize: "11vw", lineHeight: 0.85, marginBottom: "3.5vh" }}
        >
          RENTRIX
        </div>

        {/* Gold accent bar */}
        <div
          className="bg-primary"
          style={{ width: "8vw", height: "3px", marginBottom: "3.5vh" }}
        />

        {/* Arabic tagline */}
        <div
          className="font-display text-primary"
          style={{ fontSize: "2.2vw", fontWeight: 400, direction: "rtl", textAlign: "left", marginBottom: "1.5vh", textWrap: "balance" }}
        >
          منصة إدارة العقارات المتكاملة
        </div>

        {/* English tagline */}
        <div
          className="font-body text-muted"
          style={{ fontSize: "1.8vw", fontWeight: 300 }}
        >
          Integrated Property Management
        </div>
      </div>

      {/* Bottom strip */}
      <div
        className="absolute flex items-center"
        style={{ bottom: "5vh", left: "8vw", gap: "2.5vw" }}
      >
        <div className="font-body text-muted" style={{ fontSize: "1.2vw", letterSpacing: "0.15em" }}>
          2026
        </div>
        <div style={{ width: "1px", height: "2vh", background: "#B8860B60" }} />
        <div className="font-body text-muted" style={{ fontSize: "1.2vw", letterSpacing: "0.1em" }}>
          rentrix.app
        </div>
      </div>
    </div>
  );
}
