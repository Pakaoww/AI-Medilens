import { useState, useRef, useEffect } from "react";

const ACCENT = "#3B5BDB";
const ACCENT_LIGHT = "#748FFC";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Sora', sans-serif;
    background: #f0f4ff;
    min-height: 100vh;
    color: #1a1a2e;
  }

  .app {
    display: grid;
    grid-template-columns: 340px 1fr;
    grid-template-rows: 64px 1fr;
    height: 100vh;
    overflow: hidden;
  }

  /* HEADER */
  .header {
    grid-column: 1 / -1;
    background: #fff;
    border-bottom: 1px solid #e4e9ff;
    display: flex;
    align-items: center;
    padding: 0 28px;
    gap: 12px;
    z-index: 10;
  }
  .header-logo {
    width: 32px; height: 32px;
    background: ${ACCENT};
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 18px; font-weight: 700;
    flex-shrink: 0;
  }
  .header-title { font-size: 17px; font-weight: 700; color: #1a1a2e; }
  .header-sub { font-size: 12px; color: #8090b8; margin-top: 1px; }
  .header-badge {
    margin-left: auto;
    background: #eef1ff;
    color: ${ACCENT};
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    font-family: 'IBM Plex Mono', monospace;
  }

  /* LEFT PANEL */
  .left-panel {
    background: #fff;
    border-right: 1px solid #e4e9ff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .upload-zone {
    margin: 20px;
    border: 2px dashed #c5d0f5;
    border-radius: 16px;
    padding: 28px 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #f7f9ff;
    position: relative;
  }
  .upload-zone:hover, .upload-zone.dragging {
    border-color: ${ACCENT};
    background: #eef1ff;
  }
  .upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .upload-icon { font-size: 32px; margin-bottom: 10px; }
  .upload-text { font-size: 13px; font-weight: 600; color: #3b5bdb; }
  .upload-sub { font-size: 11px; color: #8090b8; margin-top: 4px; }

  .preview-area {
    margin: 0 20px 16px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .preview-img {
    width: 100%;
    border-radius: 12px;
    border: 1px solid #e4e9ff;
    object-fit: contain;
    max-height: 220px;
  }
  .file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #f7f9ff;
    border-radius: 10px;
    margin-top: 10px;
    border: 1px solid #e4e9ff;
  }
  .file-icon { font-size: 18px; }
  .file-name { font-size: 12px; font-weight: 600; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .file-size { font-size: 11px; color: #8090b8; }

  .analyze-btn {
    margin: 0 20px 20px;
    background: ${ACCENT};
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 13px;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .analyze-btn:hover:not(:disabled) { background: #2f4ac5; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,91,219,0.3); }
  .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* RIGHT PANEL */
  .right-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tabs {
    display: flex;
    padding: 16px 24px 0;
    gap: 4px;
    background: #f0f4ff;
    border-bottom: 1px solid #e4e9ff;
  }
  .tab {
    padding: 9px 18px;
    border-radius: 10px 10px 0 0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    border: none;
    color: #8090b8;
    transition: all 0.15s;
  }
  .tab.active {
    background: #fff;
    color: ${ACCENT};
    box-shadow: 0 -2px 0 ${ACCENT} inset;
  }
  .tab:hover:not(.active) { color: #1a1a2e; }

  /* RESULTS TAB */
  .results-view {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #b0c0e8;
    text-align: center;
    gap: 12px;
  }
  .empty-state-icon { font-size: 52px; opacity: 0.4; }
  .empty-state-text { font-size: 16px; font-weight: 600; }
  .empty-state-sub { font-size: 13px; max-width: 260px; line-height: 1.5; }

  .result-card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    border: 1px solid #e4e9ff;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .result-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .result-card-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .icon-summary { background: #eef1ff; }
  .icon-values { background: #e8f5e9; }
  .icon-advice { background: #fff3e0; }
  .result-card-title { font-size: 15px; font-weight: 700; }
  .result-body { font-size: 13.5px; line-height: 1.75; color: #3a4060; white-space: pre-wrap; }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    margin: 2px;
  }
  .pill-normal { background: #e8f5e9; color: #2e7d32; }
  .pill-high { background: #fce4ec; color: #c62828; }
  .pill-low { background: #fff3e0; color: #e65100; }

  .ocr-raw {
    background: #f7f9ff;
    border-radius: 10px;
    padding: 14px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: #5a6080;
    line-height: 1.6;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e4e9ff;
    white-space: pre-wrap;
  }

  /* CHAT TAB */
  .chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .msg {
    display: flex;
    gap: 10px;
    animation: fadeIn 0.25s ease;
  }
  .msg.user { flex-direction: row-reverse; }
  .msg-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
    font-weight: 700;
  }
  .msg-avatar.ai { background: ${ACCENT}; color: #fff; font-size: 13px; }
  .msg-avatar.user { background: #e4e9ff; color: ${ACCENT}; }
  .msg-bubble {
    max-width: 75%;
    padding: 11px 15px;
    border-radius: 16px;
    font-size: 13.5px;
    line-height: 1.65;
  }
  .msg.ai .msg-bubble { background: #fff; border: 1px solid #e4e9ff; color: #1a1a2e; border-radius: 4px 16px 16px 16px; }
  .msg.user .msg-bubble { background: ${ACCENT}; color: #fff; border-radius: 16px 4px 16px 16px; }
  .msg-bubble pre { white-space: pre-wrap; font-family: 'Sora', sans-serif; }

  .typing-dot {
    display: inline-block;
    width: 7px; height: 7px;
    background: #c5d0f5;
    border-radius: 50%;
    animation: bounce 1s infinite;
    margin: 0 2px;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

  .chat-input-row {
    padding: 14px 20px;
    background: #fff;
    border-top: 1px solid #e4e9ff;
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  .chat-input {
    flex: 1;
    border: 1.5px solid #e4e9ff;
    border-radius: 12px;
    padding: 11px 15px;
    font-family: 'Sora', sans-serif;
    font-size: 13.5px;
    resize: none;
    outline: none;
    max-height: 120px;
    line-height: 1.5;
    background: #f7f9ff;
    transition: border-color 0.15s;
  }
  .chat-input:focus { border-color: ${ACCENT}; background: #fff; }
  .send-btn {
    width: 42px; height: 42px;
    background: ${ACCENT};
    border: none;
    border-radius: 12px;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .send-btn:hover:not(:disabled) { background: #2f4ac5; transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .no-doc-banner {
    margin: 12px 20px;
    background: #fff9e6;
    border: 1px solid #ffe08a;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    color: #805b00;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d0d8f0; border-radius: 99px; }

  @media (max-width: 700px) {
    .app { grid-template-columns: 1fr; grid-template-rows: 64px auto 1fr; }
    .left-panel { max-height: 280px; }
  }
`;

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });

const getMimeType = (file) => file.type || "image/jpeg";

async function callClaude(messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map((b) => b.text || "").join("");
}

// ────────────────────────────────────────────────
// App
// ────────────────────────────────────────────────
export default function App() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // { summary, values, advice, rawOcr }

  const [tab, setTab] = useState("results");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "สวัสดีครับ! ฉันคือ AI ผู้ช่วยด้านสุขภาพ 🩺\nอัปโหลดผลตรวจสุขภาพของคุณ แล้วกด **วิเคราะห์** เพื่อให้ฉันอ่านและอธิบายให้ฟังนะครับ",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatting, setChatting] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatting]);

  // ── File handling ──
  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setAnalysisResult(null);
    const b64 = await toBase64(f);
    setBase64(b64);
    if (f.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  // ── Analyze ──
  const analyze = async () => {
    if (!file || !base64) return;
    setAnalyzing(true);
    try {
      const mime = getMimeType(file);
      const isPdf = file.type === "application/pdf";

      // Step 1: OCR + full analysis in one call
      const analysisMessages = [
        {
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
              : { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
            {
              type: "text",
              text: `คุณเป็น AI ผู้เชี่ยวชาญด้านการแปลผลตรวจสุขภาพ
              
กรุณาทำ 3 สิ่งต่อไปนี้จากเอกสารผลตรวจที่ได้รับ และตอบในรูปแบบ JSON ที่มีโครงสร้างดังนี้:

{
  "rawText": "ข้อความที่ OCR จากเอกสาร (สรุปสั้นๆ ไม่เกิน 300 ตัวอักษร)",
  "summary": "สรุปภาพรวมสุขภาพของผู้ป่วยในภาษาที่เข้าใจง่าย 3-4 ประโยค",
  "values": [
    { "name": "ชื่อค่า", "value": "ค่าที่ได้", "reference": "ค่าอ้างอิง", "status": "normal|high|low", "meaning": "ความหมายสั้นๆ" }
  ],
  "advice": "คำแนะนำเบื้องต้น 3-5 ข้อในการดูแลสุขภาพตามผลตรวจ"
}

ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม`,
            },
          ],
        },
      ];

      const rawResponse = await callClaude(analysisMessages, "You are a medical report analyzer. Always respond in valid JSON only.");
      const clean = rawResponse.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalysisResult(parsed);

      // Add AI message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `✅ วิเคราะห์เอกสารเสร็จแล้วครับ!\n\n${parsed.summary}\n\nคุณสามารถถามคำถามเพิ่มเติมเกี่ยวกับผลตรวจของคุณได้เลยครับ`,
        },
      ]);
      setTab("results");
    } catch (e) {
      setMessages((prev) => [...prev, { role: "ai", text: `❌ เกิดข้อผิดพลาด: ${e.message}` }]);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Chat ──
  const sendChat = async () => {
    const text = inputText.trim();
    if (!text || chatting) return;
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatting(true);

    try {
      const contextStr = analysisResult
        ? `\n\nข้อมูลผลตรวจสุขภาพของผู้ใช้:\n${JSON.stringify(analysisResult, null, 2)}`
        : "";

      const history = messages
        .filter((m) => m.role !== "ai" || m !== messages[0])
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        }));

      history.push({ role: "user", content: text });

      const reply = await callClaude(
        history,
        `คุณเป็น AI ผู้ช่วยด้านสุขภาพที่เชี่ยวชาญการแปลผลตรวจ ตอบเป็นภาษาไทยที่เข้าใจง่าย
        อย่าวินิจฉัยโรค แต่อธิบายผลตรวจและให้คำแนะนำเบื้องต้นได้
        หากไม่มีเอกสาร ให้บอกให้ผู้ใช้อัปโหลดก่อน${contextStr}`
      );

      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "ai", text: `❌ ${e.message}` }]);
    } finally {
      setChatting(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  // ── Render ──
  const formatBytes = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <>
      <style>{style}</style>
      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="header-logo">🩺</div>
          <div>
            <div className="header-title">Health Screener</div>
            <div className="header-sub">AI Lab Report Explainer</div>
          </div>
          <div className="header-badge">AI-Powered · by BBMF</div>
        </div>

        {/* LEFT PANEL */}
        <div className="left-panel">
          <div
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="upload-icon">📂</div>
            <div className="upload-text">อัปโหลดผลตรวจสุขภาพ</div>
            <div className="upload-sub">รองรับ JPG, PNG, PDF</div>
          </div>

          {file && (
            <div className="preview-area">
              {filePreview && <img src={filePreview} className="preview-img" alt="preview" />}
              <div className="file-info">
                <span className="file-icon">{file.type === "application/pdf" ? "📄" : "🖼️"}</span>
                <span className="file-name" title={file.name}>{file.name}</span>
                <span className="file-size">{formatBytes(file.size)}</span>
              </div>
            </div>
          )}

          <button
            className="analyze-btn"
            onClick={analyze}
            disabled={!file || analyzing}
          >
            {analyzing ? (
              <><div className="spinner" /> กำลังวิเคราะห์...</>
            ) : (
              <>🔬 วิเคราะห์ผลตรวจ</>
            )}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="tabs">
            <button className={`tab ${tab === "results" ? "active" : ""}`} onClick={() => setTab("results")}>
              📋 ผลวิเคราะห์
            </button>
            <button className={`tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
              💬 ถามผู้ช่วย AI
            </button>
          </div>

          {/* RESULTS TAB */}
          {tab === "results" && (
            <div className="results-view">
              {!analysisResult && !analyzing && (
                <div className="empty-state">
                  <div className="empty-state-icon">🩻</div>
                  <div className="empty-state-text">ยังไม่มีผลวิเคราะห์</div>
                  <div className="empty-state-sub">อัปโหลดผลตรวจสุขภาพและกด "วิเคราะห์ผลตรวจ" เพื่อเริ่มต้น</div>
                </div>
              )}

              {analyzing && (
                <div className="empty-state">
                  <div style={{ fontSize: 40 }}>🤖</div>
                  <div className="empty-state-text">AI กำลังอ่านผลตรวจ...</div>
                  <div className="empty-state-sub">กรุณารอสักครู่</div>
                </div>
              )}

              {analysisResult && !analyzing && (
                <>
                  {/* Summary */}
                  <div className="result-card">
                    <div className="result-card-header">
                      <div className="result-card-icon icon-summary">📝</div>
                      <div className="result-card-title">สรุปภาพรวมสุขภาพ</div>
                    </div>
                    <div className="result-body">{analysisResult.summary}</div>
                  </div>

                  {/* Values */}
                  {analysisResult.values?.length > 0 && (
                    <div className="result-card">
                      <div className="result-card-header">
                        <div className="result-card-icon icon-values">📊</div>
                        <div className="result-card-title">ค่าต่างๆ ในผลตรวจ</div>
                      </div>
                      {analysisResult.values.map((v, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < analysisResult.values.length - 1 ? "1px solid #f0f4ff" : "none" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{v.name}</div>
                            <div style={{ fontSize: 12, color: "#8090b8", marginTop: 2 }}>{v.meaning}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{v.value}</div>
                            <div style={{ fontSize: 11, color: "#b0c0e8" }}>ref: {v.reference}</div>
                          </div>
                          <span className={`status-pill pill-${v.status}`}>
                            {v.status === "normal" ? "✓ ปกติ" : v.status === "high" ? "↑ สูง" : "↓ ต่ำ"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advice */}
                  {analysisResult.advice && (
                    <div className="result-card">
                      <div className="result-card-header">
                        <div className="result-card-icon icon-advice">💡</div>
                        <div className="result-card-title">คำแนะนำเบื้องต้น</div>
                      </div>
                      <div className="result-body">{analysisResult.advice}</div>
                    </div>
                  )}

                  {/* Raw OCR */}
                  {analysisResult.rawText && (
                    <div className="result-card">
                      <div className="result-card-header">
                        <div className="result-card-icon" style={{ background: "#f3f0ff" }}>🔍</div>
                        <div className="result-card-title">ข้อความที่อ่านได้จากเอกสาร (OCR)</div>
                      </div>
                      <div className="ocr-raw">{analysisResult.rawText}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* CHAT TAB */}
          {tab === "chat" && (
            <div className="chat-view">
              {!analysisResult && (
                <div className="no-doc-banner">
                  ⚠️ ยังไม่ได้วิเคราะห์เอกสาร — AI จะตอบได้ดีขึ้นหากวิเคราะห์ผลตรวจก่อน
                </div>
              )}
              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`msg ${m.role}`}>
                    <div className={`msg-avatar ${m.role}`}>
                      {m.role === "ai" ? "AI" : "คุณ"}
                    </div>
                    <div className="msg-bubble">
                      <pre>{m.text}</pre>
                    </div>
                  </div>
                ))}
                {chatting && (
                  <div className="msg ai">
                    <div className="msg-avatar ai">AI</div>
                    <div className="msg-bubble">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-row">
                <textarea
                  className="chat-input"
                  rows={1}
                  placeholder="ถามเกี่ยวกับผลตรวจของคุณ..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button className="send-btn" onClick={sendChat} disabled={!inputText.trim() || chatting}>
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
