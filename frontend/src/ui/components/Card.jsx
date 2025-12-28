export function Card({ children }) {
    return (
      <div
        style={{
          background: "#162d29",
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        {children}
      </div>
    );
  }
  