export function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="header">
      <div className="header-inner">
        <a href="#/" className="brand">
          <span className="brand-mark">⬢</span> Shikumi
          <span className="brand-jp">仕組み</span>
        </a>
        <nav className="header-nav">
          <a href="#/docs/what-is-shikumi">Docs</a>
          <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <button className="menu-btn" onClick={onMenu} aria-label="Menu">☰</button>
      </div>
    </header>
  );
}
