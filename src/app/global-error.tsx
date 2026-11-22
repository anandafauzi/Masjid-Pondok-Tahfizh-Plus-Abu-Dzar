"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="id">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f2",
          color: "#19261f",
          fontFamily: "sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "32px" }}>⚠️</div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "20px", fontWeight: 800 }}>
            Terjadi kendala pada aplikasi
          </h1>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
            Maaf, halaman belum bisa ditampilkan. Silakan coba lagi atau muat ulang
            halaman Anda.
          </p>
          {error.digest && (
            <p style={{ marginTop: "8px", fontSize: "11px", color: "#94a3b8" }}>
              Kode galat: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "24px",
              width: "100%",
              borderRadius: "12px",
              border: 0,
              background: "#557a64",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
