import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userName, setUserName] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Simulate loading user data
    setTimeout(() => {
      setUserName("Kathryn Murphy");
      setData({
        appointments: [
          {
            id: 1,
            doctor: "Dr. Darius Kleine",
            specialty: "Dental Specialist",
            date: "Tomorrow (Thu, August 14)",
            time: "9:00 - 9:30 AM"
          },
          {
            id: 2,
            doctor: "Dr. Courtney",
            specialty: "General Practitioner",
            date: "Fri, August 15",
            time: "10:00 - 5:30 PM"
          }
        ],
        nearby: [
          {
            id: 1,
            name: "St. John Hospital",
            address: "4140 Parker Rd",
            distance: "200 m"
          },
          {
            id: 2,
            name: "ABC Pharmacy",
            address: "3801 Ranchview Dr.",
            distance: "350 m"
          }
        ],
        alerts: [
          {
            id: 1,
            text: "Latest COVID Updates",
            subtitle: "Subscribe to get daily COVID updates",
            icon: "🦠"
          }
        ]
      });
      setLoading(false);
    }, 500);
  }, []);

  if (error) {
    return <div className="home-error">Failed to load data</div>;
  }

  return (
    <div className="home-container">
      {/* Header Section */}
      <div className="home-header">
        <div className="welcome-section">
          <div className="greeting">{t("home.welcome")}</div>
          <h1 className="user-name">{userName}</h1>
        </div>
        <button className="notification-btn" onClick={() => navigate("/profile")}>
          🔔
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <span className="search-icon-left">🔍</span>
        <input
          type="text"
          placeholder={t("home.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Upcoming Appointments Section */}
      <div className="section">
        <div className="section-header">
          <h3>{t("home.appointments")}</h3>
          <a href="#" className="see-all-link" onClick={() => navigate("/health")}>
            {t("home.seeAll")}
          </a>
        </div>
        {data?.appointments && data.appointments.length > 0 ? (
          <div className="appointments-list">
            {data.appointments.map((a, index) => (
              <Card
                key={a.id}
                onClick={() => navigate("/assistant")}
                className={index === 0 ? "appointment-card appointment-card-green" : "appointment-card appointment-card-white"}
              >
                <div className="appointment-header">
                  <div className="appointment-icon">{index === 0 ? "🦷" : "📷"}</div>
                  <div className="appointment-details">
                    <div className="doctor-name">{a.doctor}</div>
                    <div className="specialty">{a.specialty}</div>
                  </div>
                </div>
                <div className="appointment-time">
                  📅 {a.date}<br />
                  ⏰ {a.time}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#999" }}>{t("home.noAppointments")}</p>
        )}
      </div>

      {/* Nearby Section */}
      <div className="section">
        <div className="section-header">
          <h3>{t("home.nearby")}</h3>
          <a href="#" className="see-all-link">{t("home.seeAll")}</a>
        </div>
        {data?.nearby && data.nearby.length > 0 ? (
          <div className="nearby-list">
            {data.nearby.map(n => (
              <Card key={n.id} className="nearby-card">
                <div className="nearby-icon">🏥</div>
                <div className="nearby-info">
                  <div className="nearby-name">{n.name}</div>
                  <div className="nearby-address">{n.address}</div>
                </div>
                <div className="nearby-distance">
                  <div className="distance-value">{n.distance}</div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {/* Good to Know Section */}
      <div className="section" style={{ paddingBottom: 100 }}>
        <div className="section-header">
          <h3>{t("home.goodToKnow")}</h3>
          <a href="#" className="see-all-link">{t("home.seeAll")}</a>
        </div>
        {data?.alerts && data.alerts.length > 0 ? (
          <div className="alerts-list">
            {data.alerts.map(a => (
              <Card key={a.id} className="alert-card">
                <div className="alert-icon">{a.icon || "📢"}</div>
                <div className="alert-text">
                  <div className="alert-title">{t("home.covidUpdates")}</div>
                  <div className="alert-subtitle">{t("home.covidSubtitle")}</div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
