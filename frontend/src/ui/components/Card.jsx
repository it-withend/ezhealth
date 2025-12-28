export const Card = ({ children }) => {
    const { theme } = useTheme();
  
    return (
      <div
        style={{
          background: theme.card,
          borderRadius: 18,
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          transition: "transform .15s ease",
        }}
        onTouchStart={(e) =>
          (e.currentTarget.style.transform = "scale(0.98)")
        }
        onTouchEnd={(e) =>
          (e.currentTarget.style.transform = "scale(1)")
        }
      >
        {children}
      </div>
    );
  };
  