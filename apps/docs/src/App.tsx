import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DocsPage } from "./pages/Docs";
import { Landing } from "./pages/Landing";

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const fn = () => setHash(location.hash);
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return hash;
}

function useCopyButtons(dep: unknown) {
  useEffect(() => {
    const handler = () => {
      document.querySelectorAll("pre").forEach((pre) => {
        if ((pre as HTMLElement).dataset.copyReady === "1") return;
        (pre as HTMLElement).dataset.copyReady = "1";
        const btn = document.createElement("button");
        btn.textContent = "Copy";
        btn.className = "copy-btn";
        btn.type = "button";
        btn.addEventListener("click", async () => {
          const code = pre.querySelector("code");
          const txt = code ? code.innerText : pre.innerText.replace("Copy", "").replace("Copied!", "").trim();
          try {
            await navigator.clipboard.writeText(txt);
          } catch {
            const ta = document.createElement("textarea");
            ta.value = txt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
          }
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "Copy"), 1500);
        });
        pre.appendChild(btn);
      });
    };
    handler();
    const obs = new MutationObserver(handler);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [dep]);
}

export default function App() {
  const hash = useHash();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDocs = hash.startsWith("#/docs");
  const docPath = isDocs ? hash.replace("#/docs/", "").replace("#/docs","") || "what-is-shikumi" : null;
  useCopyButtons(hash);

  const navigateDocs = (p: string) => {
    location.hash = `#/docs/${p}`;
    setSidebarOpen(false);
    window.scrollTo(0,0);
  };

  return (
    <div className="app">
      <Header onMenu={() => setSidebarOpen(v => !v)} />
      {isDocs ? (
        <div className="layout">
          <Sidebar active={docPath} onNavigate={navigateDocs} open={sidebarOpen} />
          <main className="main">
            {docPath && <DocsPage path={docPath} onNavigate={navigateDocs} />}
          </main>
        </div>
      ) : (
        <main className="main landing-main">
          <Landing onGetStarted={() => { location.hash = "#/docs/what-is-shikumi"; window.scrollTo(0,0); }} />
        </main>
      )}
      <footer className="footer">Shikumi — 仕組み for AI Agents · From Intelligence to Action.</footer>
    </div>
  );
}
