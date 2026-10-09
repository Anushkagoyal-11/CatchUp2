import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState(false);
  useEffect(() => { chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((result: { settings?: { apiKey?: string; model?: string } }) => { setApiKey(result.settings?.apiKey ?? ""); setModel(result.settings?.model ?? "gpt-4o-mini"); }); }, []);
  const save = async () => { await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: { apiKey, model } }); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  const removeKey = async () => { setApiKey(""); await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: { apiKey: "", model } }); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <main><header><span className="mark">C</span><div><h1>CatchUp settings</h1><p>Control your optional AI provider.</p></div></header><section><label htmlFor="key">OpenAI API key</label><input id="key" type="password" autoComplete="off" value={apiKey} placeholder="sk-…" onChange={(e) => setApiKey(e.target.value)}/><p>Your key is stored in Chrome extension storage on this device. This is not a dedicated encrypted secrets manager. Use a revocable key with limited access.</p><label htmlFor="model">Model</label><input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini"/><div className="actions"><button onClick={() => void save()}>Save settings</button><button className="remove" onClick={() => void removeKey()}>Remove key</button>{saved && <span role="status">Saved</span>}</div></section><section><h2>What CatchUp can access</h2><p>The current build captures rendered Slack message text on <code>app.slack.com</code>. It does not access other apps, hidden messages, attachments, or full page HTML. Unread status is shown as unknown.</p><p>No content leaves your browser until you select messages in the side panel and confirm the disclosure. Summaries are stored locally.</p></section></main>;
}
createRoot(document.getElementById("root")!).render(<Settings/>);
