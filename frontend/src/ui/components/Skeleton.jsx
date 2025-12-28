export const Skeleton = ({ height = 16 }) => (
    <div
      style={{
        height,
        borderRadius: 8,
        background:
          "linear-gradient(90deg,#eee,#f5f5f5,#eee)",
        animation: "pulse 1.2s infinite",
      }}
    />
  );
  