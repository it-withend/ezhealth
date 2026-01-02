export default function Card({ children, className = "", onClick, style = {} }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        ...style
      }}
    >
      {children}
    </div>
  );
}
  