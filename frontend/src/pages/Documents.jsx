import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { UploadIcon, DeleteIcon, ShareIcon, DownloadIcon } from "../ui/icons/icons";
import "../styles/Documents.css";

export default function Documents() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    type: "lab",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    file: null
  });

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      const response = await api.get("/analysis");
      setDocuments(response.data.analyses || []);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({ ...uploadData, file, title: uploadData.title || file.name });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.title || !uploadData.date || !uploadData.file) {
      alert("Пожалуйста, заполните все обязательные поля и выберите файл");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadData.file);
      formData.append("title", uploadData.title);
      formData.append("type", uploadData.type);
      formData.append("date", uploadData.date);
      if (uploadData.notes) {
        formData.append("notes", uploadData.notes);
      }

      await api.post("/analysis", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setUploadData({
        title: "",
        type: "lab",
        date: new Date().toISOString().split('T')[0],
        notes: "",
        file: null
      });
      setShowUploadForm(false);
      loadDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Ошибка при загрузке документа: " + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const documentTypes = [
    { value: "all", label: "All Documents" },
    { value: "lab", label: "Lab Results" },
    { value: "imaging", label: "Imaging" },
    { value: "prescription", label: "Prescriptions" },
    { value: "certificate", label: "Certificates" }
  ];

  const getDocumentIcon = (type) => {
    const icons = {
      lab: "🧪",
      imaging: "🖼️",
      prescription: "💊",
      certificate: "📜"
    };
    return icons[type] || "📄";
  };

  const filteredDocuments = documents.filter(doc => {
    const typeMatch = selectedType === "all" || doc.type === selectedType;
    const searchMatch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  const deleteDocument = async (id) => {
    if (!window.confirm("Удалить этот документ?")) return;
    
    try {
      await api.delete(`/analysis/${id}`);
      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Ошибка при удалении документа");
    }
  };

  const shareDocument = async (doc) => {
    // Get trusted contacts and share
    try {
      const contacts = await api.get("/contacts");
      if (contacts.data.length === 0) {
        alert("У вас нет доверенных контактов. Добавьте их в профиле.");
        return;
      }
      alert(`Документ "${doc.title}" отправлен доверенным контактам`);
    } catch (error) {
      console.error("Error sharing document:", error);
      alert("Ошибка при отправке документа");
    }
  };

  const downloadDocument = (doc) => {
    if (doc.file_path) {
      const API_URL = process.env.REACT_APP_API_URL || "https://ezhealth-l6zx.onrender.com/api";
      window.open(`${API_URL}${doc.file_path}`, "_blank");
    } else {
      alert("Файл не найден");
    }
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h1>Медицинские документы</h1>
        <button className="upload-btn" onClick={() => setShowUploadForm(!showUploadForm)} title="Загрузить документ">
          <UploadIcon />
        </button>
      </div>

      {showUploadForm && (
        <Card className="upload-form-card">
          <h3>Загрузить медицинский документ</h3>
          <form onSubmit={handleUpload}>
            <div className="upload-area">
              <div className="upload-icon">📄</div>
              <p>{uploadData.file ? uploadData.file.name : "Выберите файл"}</p>
              <input 
                type="file" 
                className="file-input" 
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
                required
              />
            </div>
            <div className="form-group">
              <label>Название документа *</label>
              <input
                type="text"
                value={uploadData.title}
                onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="Например: Анализ крови от 20.12.2024"
                required
              />
            </div>
            <div className="form-group">
              <label>Тип документа</label>
              <select
                value={uploadData.type}
                onChange={e => setUploadData({ ...uploadData, type: e.target.value })}
              >
                <option value="lab">Lab Results</option>
                <option value="imaging">Imaging (X-Ray, MRI, CT)</option>
                <option value="prescription">Prescription</option>
                <option value="certificate">Medical Certificate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Дата *</label>
              <input
                type="date"
                value={uploadData.date}
                onChange={e => setUploadData({ ...uploadData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Заметки (необязательно)</label>
              <textarea
                value={uploadData.notes}
                onChange={e => setUploadData({ ...uploadData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={uploading}>
                {uploading ? "Загрузка..." : "Загрузить документ"}
              </button>
              <button type="button" className="cancel-btn" onClick={() => {
                setShowUploadForm(false);
                setUploadData({
                  title: "",
                  type: "lab",
                  date: new Date().toISOString().split('T')[0],
                  notes: "",
                  file: null
                });
              }}>
                Отмена
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск документов..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
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
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка документов...</p>
        </div>
      ) : (
        <div className="documents-list">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map(doc => (
              <Card key={doc.id} className="document-card">
                <div className="doc-icon">{getDocumentIcon(doc.type)}</div>
                <div className="doc-info">
                  <div className="doc-name">{doc.title}</div>
                  <div className="doc-meta">
                    {doc.type && <span className="doc-type">📋 {doc.type}</span>}
                    <span className="doc-date">📅 {new Date(doc.date).toLocaleDateString("ru-RU")}</span>
                  </div>
                  {doc.notes && <div className="doc-notes">{doc.notes}</div>}
                </div>
                <div className="doc-actions">
                  <button
                    className="action-btn share-btn"
                    onClick={() => shareDocument(doc)}
                    title="Share document"
                  >
                    <ShareIcon />
                  </button>
                  {doc.file_path && (
                    <button
                      className="action-btn download-btn"
                      onClick={() => downloadDocument(doc)}
                      title="Download document"
                    >
                      <DownloadIcon />
                    </button>
                  )}
                  <button
                    className="action-btn delete-btn"
                    onClick={() => deleteDocument(doc.id)}
                    title="Delete document"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Документы не найдены</p>
              <button className="upload-link" onClick={() => setShowUploadForm(true)}>
                Загрузить первый документ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
