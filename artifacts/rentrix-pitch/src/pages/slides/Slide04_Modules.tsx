export default function Slide04_Modules() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0C1520 0%, #0F1D35 100%)" }}
    >
      {/* Top label */}
      <div
        className="absolute font-display font-semibold tracking-[0.4em] text-primary"
        style={{ top: "7vh", left: "8vw", fontSize: "1.1vw", textTransform: "uppercase" }}
      >
        Platform Modules
      </div>

      {/* Main heading */}
      <div className="absolute" style={{ top: "12vh", left: "8vw", right: "8vw" }}>
        <div
          className="font-display font-black text-text"
          style={{ fontSize: "4vw", letterSpacing: "-0.02em", marginBottom: "0.8vh" }}
        >
          Core Modules
        </div>
        <div
          className="font-body text-muted"
          style={{ fontSize: "1.6vw" }}
        >
          Every tool your team needs, built into one system.
        </div>
        <div
          className="bg-primary"
          style={{ width: "5vw", height: "2px", marginTop: "2vh" }}
        />
      </div>

      {/* 2×2 Grid */}
      <div
        className="absolute"
        style={{
          top: "31vh",
          left: "8vw",
          right: "8vw",
          bottom: "7vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "2vh 2vw",
        }}
      >
        {/* Card 1 — Properties */}
        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.18)",
            borderLeft: "3px solid #B8860B",
            padding: "2.5vh 2.5vw",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.9vw", marginBottom: "1.2vh" }}
          >
            Properties & Lands
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Manage units, buildings, and land parcels. Track occupancy, lease terms, and property status across your entire portfolio.
          </div>
        </div>

        {/* Card 2 — Contracts & Tenants */}
        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.18)",
            borderLeft: "3px solid #B8860B",
            padding: "2.5vh 2.5vw",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.9vw", marginBottom: "1.2vh" }}
          >
            Contracts & Tenants
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Digital contract lifecycle management, tenant onboarding, automated renewals, and owner distribution tracking.
          </div>
        </div>

        {/* Card 3 — Financial Suite */}
        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.18)",
            borderLeft: "3px solid #D4A017",
            padding: "2.5vh 2.5vw",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.9vw", marginBottom: "1.2vh" }}
          >
            Financial Suite
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Full accounting — invoices, receipts, payments, arrears, commissions, general ledger, and financial reports.
          </div>
        </div>

        {/* Card 4 — AI & Maintenance */}
        <div
          style={{
            background: "rgba(17, 28, 46, 0.9)",
            border: "1px solid rgba(184,134,11,0.18)",
            borderLeft: "3px solid #D4A017",
            padding: "2.5vh 2.5vw",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.9vw", marginBottom: "1.2vh" }}
          >
            Maintenance & AI
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Maintenance request workflows, smart AI assistant for insights and automation, and a built-in communication hub.
          </div>
        </div>
      </div>
    </div>
  );
}
