export default function Slide08_Closing() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0C1520 0%, #0F1D35 55%, #0C1520 100%)" }}
    >
      {/* Geometric accents — top */}
      <div
        className="absolute"
        style={{ top: "8vh", left: "8vw", width: "25vw", height: "1px", background: "linear-gradient(90deg, transparent, #B8860B, transparent)" }}
      />
      <div
        className="absolute"
        style={{ top: "8vh", right: "8vw", width: "25vw", height: "1px", background: "linear-gradient(90deg, transparent, #B8860B, transparent)" }}
      />

      {/* Geometric accents — bottom */}
      <div
        className="absolute"
        style={{ bottom: "8vh", left: "8vw", width: "25vw", height: "1px", background: "linear-gradient(90deg, transparent, #B8860B, transparent)" }}
      />
      <div
        className="absolute"
        style={{ bottom: "8vh", right: "8vw", width: "25vw", height: "1px", background: "linear-gradient(90deg, transparent, #B8860B, transparent)" }}
      />

      {/* Large circle decoration */}
      <div
        className="absolute"
        style={{
          width: "55vw",
          height: "55vw",
          borderRadius: "50%",
          border: "1px solid rgba(184,134,11,0.06)",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          border: "1px solid rgba(184,134,11,0.05)",
        }}
      />

      {/* Label */}
      <div
        className="font-display font-semibold tracking-[0.4em] text-primary"
        style={{ fontSize: "1.1vw", textTransform: "uppercase", marginBottom: "3vh", position: "relative" }}
      >
        Get Started Today
      </div>

      {/* Wordmark */}
      <div
        className="font-display font-black text-text tracking-tighter"
        style={{ fontSize: "11vw", lineHeight: 0.85, marginBottom: "3.5vh", position: "relative" }}
      >
        RENTRIX
      </div>

      {/* Gold rule */}
      <div
        className="bg-primary"
        style={{ width: "8vw", height: "3px", marginBottom: "3.5vh", position: "relative" }}
      />

      {/* Arabic tagline */}
      <div
        className="font-display text-primary"
        style={{ fontSize: "2vw", fontWeight: 400, marginBottom: "1.2vh", position: "relative" }}
      >
        منصة إدارة العقارات المتكاملة
      </div>

      {/* English tagline */}
      <div
        className="font-body text-muted"
        style={{ fontSize: "1.6vw", fontWeight: 300, marginBottom: "5vh", position: "relative" }}
      >
        Integrated Property Management Platform
      </div>

      {/* Contact row */}
      <div
        className="flex items-center"
        style={{ gap: "3vw", position: "relative" }}
      >
        <div className="font-body text-muted" style={{ fontSize: "1.3vw", letterSpacing: "0.08em" }}>
          rentrix.app
        </div>
        <div style={{ width: "1px", height: "2.5vh", background: "#B8860B60" }} />
        <div className="font-body text-muted" style={{ fontSize: "1.3vw", letterSpacing: "0.08em" }}>
          info@rentrix.app
        </div>
      </div>
    </div>
  );
}
