import { ImageResponse } from "next/og";
export const alt = "ai-sdk.pro — Your next idea starts here";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000",
          color: "#fff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 85,
        }}
      >
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: -1,
            display: "flex",
            marginBottom: 60,
          }}
        >
          ai-sdk.pro
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 78,
            fontWeight: 600,
            letterSpacing: -4,
          }}
        >
          Your next idea.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: -4,
            color: "#b3b3b3",
          }}
        >
          Starts with ai-sdk.pro.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 23,
            marginTop: 25,
            color: "#888",
          }}
        >
          Real tools. Streaming responses. Your infrastructure.
        </div>
        <div
          style={{
            width: 100,
            height: 4,
            marginTop: 38,
            background: "#ff0000",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
