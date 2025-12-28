export default function Card({ children }) {
    return (
      <div
        style={{
          background: "#162D29",
          borderRadius: 18,
          padding: 16,
          marginBottom: 12,
        }}
      >
        {children}
      </div>
    );
  }
  