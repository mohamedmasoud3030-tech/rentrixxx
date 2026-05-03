export default function Slide06_Market() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0F1D35 0%, #0C1520 60%, #0F1D35 100%)" }}
    >
      {/* Top gold accent bar */}
      <div
        className="absolute"
        style={{ top: "8vh", left: "8vw", width: "20vw", height: "1px", background: "linear-gradient(90deg, #B8860B, transparent)" }}
      />

      {/* Top label */}
      <div
        className="absolute font-display font-semibold tracking-[0.4em] text-primary"
        style={{ top: "11vh", left: "8vw", fontSize: "1.1vw", textTransform: "uppercase" }}
      >
        Target Market
      </div>

      {/* Heading */}
      <div
        className="absolute"
        style={{ top: "18vh", left: "8vw", width: "45vw" }}
      >
        <div
          className="font-display font-black text-text"
          style={{ fontSize: "4.5vw", lineHeight: 1.05, letterSpacing: "-0.02em", textWrap: "balance" }}
        >
          Built for the
        </div>
        <div
          className="font-display font-black text-primary"
          style={{ fontSize: "4.5vw", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          MENA Market
        </div>
        <div
          className="bg-primary"
          style={{ width: "5vw", height: "3px", marginTop: "2.5vh" }}
        />
      </div>

      {/* Subtitle */}
      <div
        className="absolute font-body text-muted"
        style={{ top: "47vh", left: "8vw", width: "38vw", fontSize: "1.6vw", lineHeight: 1.7, textWrap: "pretty" }}
      >
        Designed for real estate management firms, property developers, and rental offices operating across the Arab world.
      </div>

      {/* Two key metrics — left side bottom */}
      <div
        className="absolute flex"
        style={{ bottom: "8vh", left: "8vw", gap: "4vw" }}
      >
        <div>
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "4.5vw", lineHeight: 1 }}
          >
            $240B
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", marginTop: "0.8vh" }}
          >
            MENA real estate market
          </div>
        </div>
        <div style={{ width: "1px", background: "rgba(184,134,11,0.3)", height: "10vh", alignSelf: "center" }} />
        <div>
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "4.5vw", lineHeight: 1 }}
          >
            Arabic-First
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", marginTop: "0.8vh" }}
          >
            RTL interface, bilingual platform
          </div>
        </div>
      </div>

      {/* Right panel — market segments */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: 0, right: "8vw", width: "32vw", height: "100vh", gap: "2.5vh" }}
      >
        <div
          className="font-display font-semibold text-muted"
          style={{ fontSize: "1.2vw", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "1.5vh" }}
        >
          Key Segments
        </div>

        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.2)",
            borderLeft: "3px solid #B8860B",
            padding: "2vh 2vw",
          }}
        >
          <div className="font-display font-bold text-text" style={{ fontSize: "1.6vw", marginBottom: "0.5vh" }}>
            Property Management Firms
          </div>
          <div className="font-body text-muted" style={{ fontSize: "1.3vw" }}>
            Multi-building, multi-owner portfolios
          </div>
        </div>

        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.2)",
            borderLeft: "3px solid #B8860B",
            padding: "2vh 2vw",
          }}
        >
          <div className="font-display font-bold text-text" style={{ fontSize: "1.6vw", marginBottom: "0.5vh" }}>
            Real Estate Developers
          </div>
          <div className="font-body text-muted" style={{ fontSize: "1.3vw" }}>
            New developments, lead-to-lease pipelines
          </div>
        </div>

        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.2)",
            borderLeft: "3px solid #B8860B",
            padding: "2vh 2vw",
          }}
        >
          <div className="font-display font-bold text-text" style={{ fontSize: "1.6vw", marginBottom: "0.5vh" }}>
            Rental Offices &amp; Brokerages
          </div>
          <div className="font-body text-muted" style={{ fontSize: "1.3vw" }}>
            Residential and commercial leasing
          </div>
        </div>
      </div>
    </div>
  );
}
