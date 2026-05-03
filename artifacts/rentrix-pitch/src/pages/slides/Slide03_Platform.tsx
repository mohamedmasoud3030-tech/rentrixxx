export default function Slide03_Platform() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0F1D35 0%, #0C1520 100%)" }}
    >
      {/* Large background text — architectural decoration */}
      <div
        className="absolute font-display font-black select-none pointer-events-none"
        style={{
          bottom: "-5vh",
          right: "-2vw",
          fontSize: "22vw",
          color: "rgba(184,134,11,0.04)",
          lineHeight: 1,
          letterSpacing: "-0.05em",
        }}
      >
        ONE
      </div>

      {/* Top gold rule */}
      <div
        className="absolute"
        style={{ top: "8vh", left: "8vw", right: "8vw", height: "1px", background: "linear-gradient(90deg, #B8860B, transparent)" }}
      />

      {/* Top label */}
      <div
        className="absolute font-display font-semibold tracking-[0.4em] text-primary"
        style={{ top: "11vh", left: "8vw", fontSize: "1.1vw", textTransform: "uppercase" }}
      >
        The Solution
      </div>

      {/* Hero text — left aligned */}
      <div
        className="absolute"
        style={{ top: "20vh", left: "8vw", width: "55vw" }}
      >
        <div
          className="font-display font-black text-primary"
          style={{ fontSize: "6vw", lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          One Platform.
        </div>
        <div
          className="font-display font-black text-text"
          style={{ fontSize: "6vw", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "3vh" }}
        >
          Everything Managed.
        </div>
        <div
          className="font-body text-muted"
          style={{ fontSize: "1.8vw", lineHeight: 1.7, maxWidth: "45vw", textWrap: "pretty" }}
        >
          Rentrix unifies property operations, tenant relationships, financial accounting, and intelligent automation into a single Arabic-first platform.
        </div>
      </div>

      {/* Feature pills — bottom band */}
      <div
        className="absolute flex items-center"
        style={{ bottom: "12vh", left: "8vw", gap: "1.5vw" }}
      >
        <div
          className="font-display font-semibold text-text"
          style={{
            fontSize: "1.4vw",
            padding: "1vh 2vw",
            background: "rgba(184,134,11,0.12)",
            border: "1px solid rgba(184,134,11,0.3)",
          }}
        >
          Properties
        </div>
        <div
          className="font-display font-semibold text-primary"
          style={{ fontSize: "1.8vw" }}
        >
          ·
        </div>
        <div
          className="font-display font-semibold text-text"
          style={{
            fontSize: "1.4vw",
            padding: "1vh 2vw",
            background: "rgba(184,134,11,0.12)",
            border: "1px solid rgba(184,134,11,0.3)",
          }}
        >
          Contracts
        </div>
        <div
          className="font-display font-semibold text-primary"
          style={{ fontSize: "1.8vw" }}
        >
          ·
        </div>
        <div
          className="font-display font-semibold text-text"
          style={{
            fontSize: "1.4vw",
            padding: "1vh 2vw",
            background: "rgba(184,134,11,0.12)",
            border: "1px solid rgba(184,134,11,0.3)",
          }}
        >
          Finance
        </div>
        <div
          className="font-display font-semibold text-primary"
          style={{ fontSize: "1.8vw" }}
        >
          ·
        </div>
        <div
          className="font-display font-semibold text-text"
          style={{
            fontSize: "1.4vw",
            padding: "1vh 2vw",
            background: "rgba(184,134,11,0.12)",
            border: "1px solid rgba(184,134,11,0.3)",
          }}
        >
          Maintenance
        </div>
        <div
          className="font-display font-semibold text-primary"
          style={{ fontSize: "1.8vw" }}
        >
          ·
        </div>
        <div
          className="font-display font-semibold text-text"
          style={{
            fontSize: "1.4vw",
            padding: "1vh 2vw",
            background: "rgba(184,134,11,0.12)",
            border: "1px solid rgba(184,134,11,0.3)",
          }}
        >
          AI Assistant
        </div>
      </div>

      {/* Bottom gold rule */}
      <div
        className="absolute"
        style={{ bottom: "8vh", left: "8vw", right: "8vw", height: "1px", background: "linear-gradient(90deg, #B8860B, transparent)" }}
      />
    </div>
  );
}
