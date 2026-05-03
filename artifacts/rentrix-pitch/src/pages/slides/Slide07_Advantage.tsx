export default function Slide07_Advantage() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0C1520 0%, #0F1D35 100%)" }}
    >
      {/* Background accent */}
      <div
        className="absolute"
        style={{
          top: "-20vh",
          right: "-15vw",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          border: "1px solid rgba(184,134,11,0.06)",
        }}
      />

      {/* Top label */}
      <div
        className="absolute font-display font-semibold tracking-[0.4em] text-primary"
        style={{ top: "7vh", left: "8vw", fontSize: "1.1vw", textTransform: "uppercase" }}
      >
        Differentiators
      </div>

      {/* Heading */}
      <div className="absolute" style={{ top: "13vh", left: "8vw", right: "8vw" }}>
        <div
          className="font-display font-black text-text"
          style={{ fontSize: "4vw", letterSpacing: "-0.02em", marginBottom: "0.5vh" }}
        >
          The Rentrix Advantage
        </div>
        <div
          className="bg-primary"
          style={{ width: "5vw", height: "2px", marginTop: "1.5vh" }}
        />
      </div>

      {/* 4 horizontal advantage cards */}
      <div
        className="absolute flex"
        style={{
          top: "31vh",
          left: "8vw",
          right: "8vw",
          bottom: "8vh",
          gap: "2vw",
        }}
      >
        {/* Advantage 1 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.85)",
            border: "1px solid rgba(184,134,11,0.15)",
            borderTop: "3px solid #B8860B",
            padding: "3.5vh 2.2vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "3.5vw", lineHeight: 1, marginBottom: "2vh", opacity: 0.5 }}
          >
            01
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.7vw", marginBottom: "1.8vh", lineHeight: 1.25 }}
          >
            Arabic-First Design
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Full RTL interface with bilingual support — Arabic and English throughout every module.
          </div>
        </div>

        {/* Advantage 2 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.85)",
            border: "1px solid rgba(184,134,11,0.15)",
            borderTop: "3px solid #B8860B",
            padding: "3.5vh 2.2vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "3.5vw", lineHeight: 1, marginBottom: "2vh", opacity: 0.5 }}
          >
            02
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.7vw", marginBottom: "1.8vh", lineHeight: 1.25 }}
          >
            Full Accounting
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            13+ financial modules including general ledger, arrears, commissions, and automated reporting.
          </div>
        </div>

        {/* Advantage 3 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.85)",
            border: "1px solid rgba(184,134,11,0.15)",
            borderTop: "3px solid #B8860B",
            padding: "3.5vh 2.2vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "3.5vw", lineHeight: 1, marginBottom: "2vh", opacity: 0.5 }}
          >
            03
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.7vw", marginBottom: "1.8vh", lineHeight: 1.25 }}
          >
            Smart AI Assistant
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Built-in AI for operational insights, automated workflows, and intelligent decision support.
          </div>
        </div>

        {/* Advantage 4 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.85)",
            border: "1px solid rgba(184,134,11,0.15)",
            borderTop: "3px solid #B8860B",
            padding: "3.5vh 2.2vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "3.5vw", lineHeight: 1, marginBottom: "2vh", opacity: 0.5 }}
          >
            04
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.7vw", marginBottom: "1.8vh", lineHeight: 1.25 }}
          >
            Web &amp; Mobile
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.4vw", lineHeight: 1.65, textWrap: "pretty" }}
          >
            Full-featured web platform plus a native mobile app — manage your portfolio from anywhere.
          </div>
        </div>
      </div>
    </div>
  );
}
