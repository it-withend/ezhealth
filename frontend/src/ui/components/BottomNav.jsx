export default function BottomNav({ current, onChange }) {
    const tabs = ["Home", "Assistant", "Profile"];
  
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#162D29",
          display: "flex",
          justifyContent: "space-around",
          padding: 12,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              background: "none",
              border: "none",
              color: current === tab ? "#3BAA9D" : "#9DBBB6",
              fontWeight: 600,
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    );
  }
  