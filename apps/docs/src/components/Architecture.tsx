export function Architecture() {
  return (
    <div className="arch">
      <div className="arch-col">
        <div className="node user">User</div>
        <div className="arrow">↓</div>
        <div className="node cli">CLI <small>Ink + Bun</small></div>
        <div className="arrow">↓</div>
        <div className="node runtime">Agent Runtime</div>
        <div className="arch-grid">
          <div className="node sub">Model</div>
          <div className="node sub">Tools</div>
          <div className="node sub">MCP</div>
        </div>
        <div className="arrow">↓</div>
        <div className="node exec">Execution</div>
        <div className="arrow">↓</div>
        <div className="node world">Real World <small>fs · shell · git · web</small></div>
      </div>
    </div>
  );
}
