import { nav } from "../content/nav";

export function Sidebar({ active, onNavigate, open }: { active: string | null; onNavigate: (p: string) => void; open: boolean }) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      {nav.map(sec => (
        <div key={sec.title} className="nav-section">
          <div className="nav-title">{sec.title}</div>
          {sec.items.map(it => (
            <a key={it.path} className={`nav-link ${active===it.path ? "active" : ""}`} href={`#/docs/${it.path}`} onClick={e => { e.preventDefault(); onNavigate(it.path); }}>
              {it.title}
            </a>
          ))}
        </div>
      ))}
    </aside>
  );
}
