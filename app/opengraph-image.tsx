import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ConsultR - AI-Powered Deep Research";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0f1a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient background */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, #1e3a5f 0%, #0a0f1a 50%, #132740 100%)",
          }}
        />

        {/* Decorative glow - top right */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201, 162, 39, 0.15) 0%, transparent 70%)",
          }}
        />

        {/* Decorative glow - bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(74, 144, 217, 0.1) 0%, transparent 70%)",
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "60px 80px",
            height: "100%",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Left side - Icon */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "60px",
            }}
          >
            {/* Icon container with glow effect */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 200,
                height: 200,
                borderRadius: 32,
                background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)",
                boxShadow: "0 20px 60px rgba(201, 162, 39, 0.3), 0 0 100px rgba(74, 144, 217, 0.2)",
                border: "2px solid rgba(201, 162, 39, 0.3)",
              }}
            >
              <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                <path
                  d="M20 55h100v55a12 12 0 0 1-12 12H32a12 12 0 0 1-12-12V55z"
                  fill="#c9a227"
                />
                <path
                  d="M45 55V38a12 12 0 0 1 12-12h26a12 12 0 0 1 12 12v17"
                  stroke="#c9a227"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
                <rect x="55" y="70" width="30" height="22" rx="4" fill="#1e3a5f" />
                <path d="M25 60h90" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Right side - Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* Tagline */}
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#c9a227",
                textTransform: "uppercase",
                letterSpacing: "4px",
                marginBottom: "16px",
              }}
            >
              AI-Powered Research Platform
            </div>

            {/* Main title */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.0,
                marginBottom: "4px",
                letterSpacing: "-2px",
              }}
            >
              Consulting
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.0,
                marginBottom: "4px",
                letterSpacing: "-2px",
              }}
            >
              Research
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: "#c9a227",
                lineHeight: 1.0,
                marginBottom: "32px",
                letterSpacing: "-2px",
              }}
            >
              Intelligence
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 24,
                color: "#9ca3af",
                marginBottom: "32px",
                maxWidth: "600px",
                lineHeight: 1.4,
              }}
            >
              Generate comprehensive research reports in minutes. Built for consultants at top firms.
            </div>

            {/* Feature badges */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: "rgba(201, 162, 39, 0.15)",
                  border: "1px solid rgba(201, 162, 39, 0.3)",
                  color: "#c9a227",
                  padding: "10px 20px",
                  borderRadius: "20px",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Due Diligence
              </div>
              <div
                style={{
                  background: "rgba(74, 144, 217, 0.15)",
                  border: "1px solid rgba(74, 144, 217, 0.3)",
                  color: "#4a90d9",
                  padding: "10px 20px",
                  borderRadius: "20px",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Market Analysis
              </div>
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  color: "#22c55e",
                  padding: "10px 20px",
                  borderRadius: "20px",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Competitive Intel
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #c9a227 0%, #e8c547 50%, #c9a227 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}

