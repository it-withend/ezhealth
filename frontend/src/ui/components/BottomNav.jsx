export function BottomNav({ page, onChange }) {
    return (
      <div className="bottom-nav">
        <button
          className={page === "Home" ? "active" : ""}
          onClick={() => onChange("Home")}
        >
          Home
        </button>
  
        <button
          className={page === "Assistant" ? "active" : ""}
          onClick={() => onChange("Assistant")}
        >
          Assistant
        </button>
  
        <button
          className={page === "Profile" ? "active" : ""}
          onClick={() => onChange("Profile")}
        >
          Profile
        </button>
      </div>
    );
  }
  