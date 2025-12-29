import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import "../styles/Documents.css";

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: "Blood Test Report",
      type: "lab",
      date: "2024-12-20",
      icon: "🧪",
      size: "245 KB",
      doctor: "Dr. Sarah Smith"
    },
    {
      id: 2,
      name: "X-Ray Chest",
      type: "imaging",
      date: "2024-12-15",
      icon: "🖼️",
      size: "1.2 MB",
      doctor: "Dr. James Wilson"
    },
    {
      id: 3,
      name: "Prescription - Vitamin D",
      type: "prescription",
      date: "2024-12-10",
      icon: "💊",
      size: "98 KB",
      doctor: "Dr. Emma Davis"
    },
    {
      id: 4,
      name: "Medical Certificate",
      type: "certificate",
      date: "2024-12-05",
      icon: "📜",
      size: "156 KB",
      doctor: "Health Center"
    },
    {
      id: 5,
      name: "MRI Brain Scan",
      type: "imaging",
      date: "2024-11-28",
      icon: "🧠",
      size: "3.5 MB",
      doctor: "Dr. Michael Johnson"
    }
  ]);
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);

  const documentTypes = [
    { value: "all", label: "All Documents" },
    { value: "lab", label: "Lab Results" },
    { value: "imaging", label: "Imaging" },
    { value: "prescription", label: "Prescriptions" },
    { value: "certificate", label: "Certificates" }
  ];

  const filteredDocuments = documents.filter(doc => {
    const typeMatch = selectedType === "all" || doc.type === selectedType;
    const searchMatch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  const deleteDocument = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const shareDocument = (doc) => {
    alert(`Sharing "${doc.name}" with trusted contacts...`);
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h1>Medical Documents</h1>
        <button className="upload-btn" onClick={() => setShowUploadForm(!showUploadForm)}>
          ⬆️ Upload
        </button>
      </div>

      {showUploadForm && (
        <Card className="upload-form-card">
          <h3>Upload Medical Document</h3>
          <div className="upload-area">
            <div className="upload-icon">📄</div>
            <p>Drag and drop your file or click to browse</p>
            <input type="file" className="file-input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </div>
          <div className="form-group">
            <label>Document Type</label>
            <select className="select-input">
              <option>Lab Results</option>
              <option>Imaging (X-Ray, MRI, CT)</option>
              <option>Prescription</option>
              <option>Medical Certificate</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="submit-btn">Upload Document</button>
            <button className="cancel-btn" onClick={() => setShowUploadForm(false)}>Cancel</button>
          </div>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-tabs">
          {documentTypes.map(type => (
            <button
              key={type.value}
              className={`filter-tab ${selectedType === type.value ? "active" : ""}`}
              onClick={() => setSelectedType(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="documents-list">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map(doc => (
            <Card key={doc.id} className="document-card">
              <div className="doc-icon">{doc.icon}</div>
              <div className="doc-info">
                <div className="doc-name">{doc.name}</div>
                <div className="doc-meta">
                  <span className="doc-doctor">👨‍⚕️ {doc.doctor}</span>
                  <span className="doc-date">📅 {new Date(doc.date).toLocaleDateString()}</span>
                </div>
                <div className="doc-size">Size: {doc.size}</div>
              </div>
              <div className="doc-actions">
                <button
                  className="action-btn share-btn"
                  onClick={() => shareDocument(doc)}
                  title="Share document"
                >
                  👥
                </button>
                <button
                  className="action-btn download-btn"
                  onClick={() => alert("Downloading: " + doc.name)}
                  title="Download document"
                >
                  ⬇️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => deleteDocument(doc.id)}
                  title="Delete document"
                >
                  ✕
                </button>
              </div>
            </Card>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No documents found</p>
            <button className="upload-link" onClick={() => setShowUploadForm(true)}>
              Upload your first document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
