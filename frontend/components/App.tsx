"use client";
/* Arc Gift — standalone USDC gift-card dApp (pink/amber). Self-contained.
   ABI preserved: create(message,codeHash,hasCode)/claim(id,code)/reclaim(id)/get/getCreated/total. */
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import { parseEther, formatEther, keccak256, toBytes, isAddress } from "viem";
const C = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52", ZH = ("0x" + "0".repeat(64)) as `0x${string}`;
const ABI = [
  { name: "create", type: "function", stateMutability: "payable", inputs: [{ name: "message", type: "string" }, { name: "codeHash", type: "bytes32" }, { name: "hasCode", type: "bool" }], outputs: [{ type: "uint256" }] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "code", type: "string" }], outputs: [] },
  { name: "reclaim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "from", type: "address" }, { name: "amount", type: "uint256" }, { name: "message", type: "string" }, { name: "codeHash", type: "bytes32" }, { name: "hasCode", type: "bool" }, { name: "claimed", type: "bool" }, { name: "claimer", type: "address" }] }] },
  { name: "getCreated", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const usd = (w?: bigint) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }
const CSS = `
.gf{--bg:#fff5fb;--card:#fff;--bd:#f3d6e8;--bd2:#efc7de;--mut:#8a5a76;--txt:#3a1230;--acc:#ec4899;--acc2:#db2777;min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Poppins','Segoe UI',system-ui,sans-serif}
.gf *{box-sizing:border-box}.gf a{color:var(--acc);text-decoration:none}
.gf header{display:flex;align-items:center;gap:10px;padding:15px 6vw;border-bottom:1px solid #f6dcec;background:#fff}
.gf .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.gf .mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#ec4899,#f59e0b);display:grid;place-items:center;font-size:15px}
.gf .chip{font-size:11px;color:var(--mut);border:1px solid var(--bd2);border-radius:99px;padding:3px 10px}
.gf .btn{border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;padding:9px 16px;transition:.15s}.gf .btn:disabled{opacity:.5;cursor:not-allowed}
.gf .pri{background:var(--acc);color:#fff}.gf .pri:hover:not(:disabled){background:var(--acc2)}.gf .red{background:#dc2626;color:#fff}.gf .gho{background:#fff;color:var(--acc);border:1px solid var(--bd2)}
.gf .wrap{max-width:880px;margin:0 auto;padding:24px 22px 60px}
.gf .tabs{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--bd);border-radius:12px;padding:4px;margin-bottom:18px}
.gf .tab{border:0;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:13px;padding:8px 16px;border-radius:9px;cursor:pointer}.gf .tab.on{background:var(--acc);color:#fff}
.gf .grid{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start}
.gf .gcard{background:linear-gradient(140deg,#ec4899,#a855f7 60%,#f59e0b);border-radius:20px;padding:22px;color:#fff;box-shadow:0 20px 44px -22px rgba(168,85,247,.6);min-height:170px;position:relative}
.gf .card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:18px}
.gf label{display:block;font-size:12px;color:var(--mut);font-weight:600;margin:8px 0 5px}
.gf input,.gf textarea{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:11px;padding:11px 13px;font:inherit;font-size:14px;color:var(--txt);outline:none;resize:none}.gf input:focus,.gf textarea:focus{border-color:var(--acc)}
.gf .item{background:#fff;border:1px solid var(--bd);border-radius:14px;padding:14px;margin-bottom:10px}
.gf .menu{position:absolute;right:0;top:115%;background:#fff;border:1px solid var(--bd);border-radius:11px;padding:6px;min-width:180px;z-index:30;box-shadow:0 14px 34px rgba(120,30,80,.16)}
.gf .menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--txt);font:inherit;font-weight:600;font-size:13px;padding:8px 11px;border-radius:8px;cursor:pointer}.gf .menu button:hover{background:var(--bg)}
@media(max-width:780px){.gf .grid{grid-template-columns:1fr}}
`;
function GiftRow({ id, me, busy, write }: { id: bigint; me?: string; busy: boolean; write: (fn: string, args: any[]) => void }) {
  const { data: g } = useReadContract({ address: C, abi: ABI, functionName: "get", args: [id] });
  const [code, setCode] = useState(""); if (!g) return null; const it = g as any;
  const maker = me?.toLowerCase() === it.from.toLowerCase();
  return (
    <div className="item">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🎁</div>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 22, fontWeight: 800, color: "var(--acc2)" }}>${usd(it.amount)}</div><div style={{ fontSize: 11, color: "var(--mut)" }}>#{id.toString()} · from {cut(it.from)}{it.hasCode && !it.claimed ? " · 🔒" : ""}</div></div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: it.claimed ? "rgba(138,90,118,.12)" : "rgba(236,72,153,.14)", color: it.claimed ? "var(--mut)" : "var(--acc2)" }}>{it.claimed ? "Claimed ✓" : "Open"}</span>
      </div>
      {it.message && <div style={{ fontSize: 13, color: "var(--mut)", fontStyle: "italic", margin: "8px 0 0" }}>"{it.message}"</div>}
      {!it.claimed && <div style={{ marginTop: 10 }}>
        {it.hasCode && <input value={code} onChange={e => setCode(e.target.value)} placeholder="Secret code" style={{ marginBottom: 8 }} />}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn pri" style={{ flex: 1 }} disabled={busy} onClick={() => write("claim", [id, code])}>{busy ? "…" : "Claim 🎁"}</button>
          {maker && <button className="btn gho" disabled={busy} onClick={() => write("reclaim", [id])}>Reclaim</button>}
        </div>
      </div>}
    </div>
  );
}
export default function App() {
  const { address, isConnected } = useAccount(); const net = useChainId();
  const { connectors, connect } = useConnect(); const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false); const [tab, setTab] = useState<"create" | "browse" | "earn">("create");
  const [ev, setEv] = useState({ to: "", amount: "" });
  const sendx = useSendTransaction(); const srcpt = useWaitForTransactionReceipt({ hash: sendx.data, query: { enabled: !!sendx.data } });
  const sbusy = sendx.isPending || srcpt.isLoading;
  const [form, setForm] = useState({ amount: "50", message: "", code: "", useCode: false });
  const tx = useWriteContract(); const rcpt = useWaitForTransactionReceipt({ hash: tx.data, query: { enabled: !!tx.data } });
  const busy = tx.isPending || rcpt.isLoading;
  const total = useReadContract({ address: C, abi: ABI, functionName: "total" });
  const mine = useReadContract({ address: C, abi: ABI, functionName: "getCreated", args: address ? [address] : undefined, query: { enabled: !!address } });
  useEffect(() => { if (rcpt.isSuccess) { tx.reset(); setForm({ amount: "50", message: "", code: "", useCode: false }); total.refetch(); mine.refetch(); } }, [rcpt.isSuccess]); // eslint-disable-line
  useEffect(() => { if (srcpt.isSuccess) { sendx.reset(); setEv({ to: "", amount: "" }); } }, [srcpt.isSuccess]); // eslint-disable-line
  const wrong = isConnected && net !== CHAIN; const n = total.data !== undefined ? Number(total.data) : 0;
  const write = (fn: string, args: any[]) => tx.writeContract({ address: C, abi: ABI, functionName: fn as any, args });
  return (
    <div className="gf">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="logo"><span className="mark">🎁</span>Arc Gift</div>
        <span className="chip">{n} gifts sent</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button className={"btn " + (wrong ? "red" : "")} onClick={toArc} style={wrong ? {} : { background: "transparent", color: "var(--mut)", border: "1px solid var(--bd2)" }}>{wrong ? "Switch to Arc" : "⚡ Arc network"}</button>
          <div style={{ position: "relative" }}><button className="btn pri" onClick={() => setPop(p => !p)}>{isConnected ? cut(address) : "Connect"}</button>
            {pop && <div className="menu">{isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={{ color: "#dc2626" }}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }}>{c.name}</button>)}</div>}</div>
        </div>
      </header>
      <div className="wrap">
        <div className="tabs">{([["create", "Create"], ["browse", "Browse"], ["earn", "Earn"]] as const).map(([t, l]) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{l}</button>)}</div>
        {tab === "create" && <div className="grid">
          <div className="gcard">
            <div style={{ fontSize: 13, opacity: .9, fontWeight: 600 }}>USDC gift card</div>
            <div style={{ fontSize: 42, fontWeight: 800, margin: "14px 0 2px" }}>${form.amount || "0"}</div>
            <div style={{ fontSize: 13, opacity: .9 }}>{form.message || "Add a message…"}</div>
            <div style={{ position: "absolute", right: 18, bottom: 16, fontSize: 34 }}>🎁</div>
          </div>
          <div className="card">
            <label>Amount (USDC)</label><input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} type="number" style={{ fontSize: 18, fontWeight: 800 }} />
            <label>Message</label><textarea rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Happy birthday! 🎉" />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}><input type="checkbox" style={{ width: "auto" }} checked={form.useCode} onChange={e => setForm(f => ({ ...f, useCode: e.target.checked }))} /> Protect with a secret code</label>
            {form.useCode && <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Secret code" style={{ marginTop: 8 }} />}
            <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || !(Number(form.amount) > 0)} onClick={() => write("create", [form.message, form.useCode ? keccak256(toBytes(form.code)) : ZH, form.useCode])} >{busy ? "…" : "Create gift link 🎁"}</button>
            {mine.data && (mine.data as readonly bigint[]).length > 0 && <div style={{ fontSize: 11, color: "var(--mut)", textAlign: "center", marginTop: 8 }}>Your gift IDs: {(mine.data as readonly bigint[]).map(x => x.toString()).join(", ")}</div>}
          </div>
        </div>}
        {tab === "browse" && <div style={{ maxWidth: 520, margin: "0 auto" }}>{n > 0 ? Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <GiftRow key={id.toString()} id={id} me={address} busy={busy} write={write} />) : <div style={{ color: "var(--mut)", textAlign: "center", padding: "40px 0" }}>No gifts yet — be the first 🎁</div>}</div>}
        {tab === "earn" && <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Grow your gift funds</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}>Deposit USDC to a savings address to set aside for gifting.</div>
          <label>Vault / savings address</label><input value={ev.to} onChange={e => setEv(s => ({ ...s, to: e.target.value }))} placeholder="0x…" style={{ fontFamily: "ui-monospace" }} />
          <label>Amount (USDC)</label><input value={ev.amount} onChange={e => setEv(s => ({ ...s, amount: e.target.value }))} type="number" placeholder="0.00" style={{ fontSize: 20, fontWeight: 800 }} />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || sbusy || !isAddress(ev.to) || !(Number(ev.amount) > 0)} onClick={() => sendx.sendTransaction({ to: ev.to as `0x${string}`, value: parseEther(ev.amount || "0") })}>{sbusy ? "Depositing…" : "Deposit to earn 🎁"}</button>
          {srcpt.isSuccess && <div style={{ fontSize: 12, color: "#16a34a", textAlign: "center", marginTop: 8 }}>✓ Deposited</div>}
        </div>}
        <div style={{ textAlign: "center", color: "#caa3bc", fontSize: 12, marginTop: 24 }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer">Arc Network</a></div>
      </div>
    </div>
  );
}
