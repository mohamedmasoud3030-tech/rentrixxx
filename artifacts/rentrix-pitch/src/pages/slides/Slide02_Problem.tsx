export default function Slide02_Problem() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0C1520 0%, #0F1D35 100%)" }}
    >
      {/* Background gold circle accent */}
      <div
        className="absolute"
        style={{
          bottom: "-15vh",
          right: "-10vw",
          width: "55vw",
          height: "55vw",
          borderRadius: "50%",
          border: "1px solid rgba(184,134,11,0.08)",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: "-20vh",
          right: "-15vw",
          width: "70vw",
          height: "70vw",
          borderRadius: "50%",
          border: "1px solid rgba(184,134,11,0.05)",
        }}
      />

      {/* Top label */}
      <div
        className="absolute font-display font-semibold tracking-[0.4em] text-primary"
        style={{ top: "8vh", left: "8vw", fontSize: "1.1vw", textTransform: "uppercase" }}
      >
        The Challenge
      </div>

      {/* Main heading */}
      <div
        className="absolute"
        style={{ top: "14vh", left: "8vw", width: "60vw" }}
      >
        <div
          className="font-display font-black text-text tracking-tight"
          style={{ fontSize: "5vw", lineHeight: 1.1, textWrap: "balance" }}
        >
          Property Management
        </div>
        <div
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", lineHeight: 1.1, color: "#B8860B" }}
        >
          Is Still Broken.
        </div>
        <div
          className="bg-primary"
          style={{ width: "5vw", height: "3px", marginTop: "2.5vh" }}
        />
      </div>

      {/* Three pain point columns */}
      <div
        className="absolute flex"
        style={{ bottom: "8vh", left: "8vw", right: "8vw", gap: "2.5vw" }}
      >
        {/* Pain point 1 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.8)",
            border: "1px solid rgba(184,134,11,0.2)",
            borderTop: "3px solid #B8860B",
            padding: "3vh 2.5vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "4vw", lineHeight: 1, marginBottom: "1.5vh", opacity: 0.4 }}
          >
            01
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.8vw", marginBottom: "1.5vh" }}
          >
            Manual Operations
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.5vw", lineHeight: 1.6, textWrap: "pretty" }}
          >
            Spreadsheets, paper contracts, and fragmented tools slow every team down and create costly errors.
          </div>
        </div>

        {/* Pain point 2 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.8)",
            border: "1px solid rgba(184,134,11,0.2)",
            borderTop: "3px solid #B8860B",
            padding: "3vh 2.5vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "4vw", lineHeight: 1, marginBottom: "1.5vh", opacity: 0.4 }}
          >
            02
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.8vw", marginBottom: "1.5vh" }}
          >
            Disconnected Systems
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.5vw", lineHeight: 1.6, textWrap: "pretty" }}
          >
            Separate tools for tenants, accounting, maintenance, and communication with no single source of truth.
          </div>
        </div>

        {/* Pain point 3 */}
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "rgba(17, 28, 46, 0.8)",
            border: "1px solid rgba(184,134,11,0.2)",
            borderTop: "3px solid #B8860B",
            padding: "3vh 2.5vw",
          }}
        >
          <div
            className="font-display font-black text-primary"
            style={{ fontSize: "4vw", lineHeight: 1, marginBottom: "1.5vh", opacity: 0.4 }}
          >
            03
          </div>
          <div
            className="font-display font-bold text-text"
            style={{ fontSize: "1.8vw", marginBottom: "1.5vh" }}
          >
            No Financial Clarity
          </div>
          <div
            className="font-body text-muted"
            style={{ fontSize: "1.5vw", lineHeight: 1.6, textWrap: "pretty" }}
          >
            Owners and managers lack real-time financial visibility — arrears pile up, reports are always late.
          </div>
        </div>
      </div>
    </div>
  );
}
