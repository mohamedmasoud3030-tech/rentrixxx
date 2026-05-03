export default function Slide05_Financial() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0C1520 0%, #0F1D35 100%)" }}
    >
      {/* Background watermark */}
      <div
        className="absolute font-display font-black select-none pointer-events-none"
        style={{
          bottom: "-8vh",
          left: "-2vw",
          fontSize: "28vw",
          color: "rgba(184,134,11,0.03)",
          lineHeight: 1,
          letterSpacing: "-0.05em",
        }}
      >
        FIN
      </div>

      {/* Top label */}
      <div
        className="absolute font-display font-semibold tracking-[0.4em] text-primary"
        style={{ top: "7vh", left: "8vw", fontSize: "1.1vw", textTransform: "uppercase" }}
      >
        Financial Intelligence
      </div>

      {/* Left — big stat */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: 0, left: "8vw", width: "38vw", height: "100vh" }}
      >
        <div
          className="font-display font-black text-primary"
          style={{ fontSize: "16vw", lineHeight: 0.85, letterSpacing: "-0.04em" }}
        >
          13+
        </div>
        <div
          className="font-display font-bold text-text"
          style={{ fontSize: "2.2vw", marginTop: "2vh", marginBottom: "0.8vh" }}
        >
          Financial Modules
        </div>
        <div
          className="font-body text-muted"
          style={{ fontSize: "1.5vw" }}
        >
          Built-in accounting suite
        </div>
      </div>

      {/* Gold vertical divider */}
      <div
        className="absolute"
        style={{
          top: "12vh",
          left: "47vw",
          width: "1px",
          height: "76vh",
          background: "linear-gradient(180deg, transparent, #B8860B60, #B8860B, #B8860B60, transparent)",
        }}
      />

      {/* Right — feature list */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: 0, right: "8vw", width: "38vw", height: "100vh" }}
      >
        <div
          className="font-display font-bold text-text"
          style={{ fontSize: "2vw", marginBottom: "3.5vh" }}
        >
          Complete Accounting Suite
        </div>

        <div className="flex flex-col" style={{ gap: "2.2vh" }}>
          <div className="flex items-start" style={{ gap: "1.5vw" }}>
            <div className="bg-primary flex-shrink-0" style={{ width: "2px", height: "2.5vh", marginTop: "0.4vh" }} />
            <div className="font-body text-text" style={{ fontSize: "1.55vw" }}>
              General Ledger &amp; Chart of Accounts
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "1.5vw" }}>
            <div className="bg-primary flex-shrink-0" style={{ width: "2px", height: "2.5vh", marginTop: "0.4vh" }} />
            <div className="font-body text-text" style={{ fontSize: "1.55vw" }}>
              Invoices, Receipts &amp; Payments
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "1.5vw" }}>
            <div className="bg-primary flex-shrink-0" style={{ width: "2px", height: "2.5vh", marginTop: "0.4vh" }} />
            <div className="font-body text-text" style={{ fontSize: "1.55vw" }}>
              Arrears Management &amp; Debt Tracking
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "1.5vw" }}>
            <div className="bg-primary flex-shrink-0" style={{ width: "2px", height: "2.5vh", marginTop: "0.4vh" }} />
            <div className="font-body text-text" style={{ fontSize: "1.55vw" }}>
              Owner Distributions &amp; Commissions
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "1.5vw" }}>
            <div className="bg-primary flex-shrink-0" style={{ width: "2px", height: "2.5vh", marginTop: "0.4vh" }} />
            <div className="font-body text-text" style={{ fontSize: "1.55vw" }}>
              Expense Tracking &amp; Budget Control
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "1.5vw" }}>
            <div className="bg-primary flex-shrink-0" style={{ width: "2px", height: "2.5vh", marginTop: "0.4vh" }} />
            <div className="font-body text-text" style={{ fontSize: "1.55vw" }}>
              Automated Financial Reports
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
