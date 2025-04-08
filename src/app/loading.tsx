export default function GlobalLoading() {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <img
          src="/images/aipca_logo.png"
          alt="Loading..."
          style={{ width: "300px", height: "500px" }}
        />
        <p > </p>
        <p > </p>
        <p style={{ fontSize: "2rem" }}>Loading, please wait...</p>
      </div>
    );
  }
  