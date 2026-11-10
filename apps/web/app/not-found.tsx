import { Header, ButtonLink } from "@aisdkpro/ui";
export default function NotFound() {
  return (
    <>
      <Header />
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <span style={{ color: "var(--subtle)", fontSize: 12 }}>
          404 · PAGE NOT FOUND
        </span>
        <h1 style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1 }}>
          This route goes nowhere.
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Let’s get you back to something useful.
        </p>
        <ButtonLink href="/">Back to home</ButtonLink>
      </main>
    </>
  );
}
