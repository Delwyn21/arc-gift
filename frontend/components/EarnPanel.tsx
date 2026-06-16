"use client";
import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";

// Professional on-chain USDC yield vault (our own ArcVault) — DeFi-style UI.
const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x0") as `0x${string}`;
const ABI = [
  { name: "deposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "principalOf", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "earned", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "apyBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalPrincipal", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const usd = (w?: bigint, d = 2) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

export function EarnPanel({ heading, color = "emerald" }: { heading: string; color?: string }) {
  const c = color;
  const { address, isConnected } = useAccount();
  const [amt, setAmt] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const { data: wbal } = useBalance({ address, query: { enabled: !!address } });
  const { data: apy } = useReadContract({ address: VAULT, abi: ABI, functionName: "apyBps" });
  const { data: tvl } = useReadContract({ address: VAULT, abi: ABI, functionName: "totalPrincipal" });
  const { data: principal, refetch: rP } = useReadContract({ address: VAULT, abi: ABI, functionName: "principalOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: bal, refetch: rB } = useReadContract({ address: VAULT, abi: ABI, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: earned, refetch: rE } = useReadContract({ address: VAULT, abi: ABI, functionName: "earned", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => { if (isSuccess) { rP(); rB(); rE(); reset(); setAmt(""); } }, [isSuccess]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => { if (address) { rB(); rE(); } }, 6000); return () => clearInterval(t); }, [address]); // eslint-disable-line
  const busy = isPending || isConfirming;
  const apyPct = apy === undefined ? "—" : (Number(apy) / 100).toFixed(1);
  const hasPos = principal !== undefined && (principal as bigint) > 0n;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold px-1">{heading}</h3>
      {/* stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`bg-gradient-to-br from-${c}-500/15 to-${c}-500/5 border border-${c}-500/20 rounded-2xl p-4`}><div className="text-xs text-gray-400">APY</div><div className={`text-2xl font-extrabold text-${c}-300`}>{apyPct}%</div></div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4"><div className="text-xs text-gray-400">Total deposited</div><div className="text-2xl font-extrabold">${usd(tvl as bigint, 0)}</div></div>
      </div>

      {/* position */}
      {hasPos && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between"><span className="text-xs text-gray-400">Your position</span><span className={`text-xs px-2 py-0.5 rounded-full bg-${c}-500/15 text-${c}-300`}>active</span></div>
        <div className="text-3xl font-black">${usd(bal as bigint, 4)}</div>
        <div className="flex justify-between text-xs"><span className="text-gray-500">Principal ${usd(principal as bigint)}</span><span className="text-emerald-400 font-semibold tabular-nums">+${usd(earned as bigint, 6)} earned</span></div>
      </div>}

      {/* tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(["deposit", "withdraw"] as const).map(m => <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${mode === m ? `bg-${c}-500 text-black` : "text-gray-400 hover:text-gray-200"}`}>{m}</button>)}
      </div>

      {mode === "deposit" ? <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500"><span>Amount</span><span>Wallet: {wbal ? Number(formatEther(wbal.value)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} USDC <button onClick={() => wbal && setAmt(formatEther(wbal.value))} className={`text-${c}-400 font-semibold ml-1 hover:underline`}>MAX</button></span></div>
        <div className="flex items-center gap-3"><input value={amt} onChange={e => setAmt(e.target.value)} type="number" placeholder="0" className="w-full bg-transparent text-2xl font-bold focus:outline-none placeholder:text-gray-600" /><span className="shrink-0 bg-gray-800 rounded-full px-3 py-1.5 text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 grid place-items-center text-[11px] text-white">$</span>USDC</span></div>
        <button onClick={() => writeContract({ address: VAULT, abi: ABI, functionName: "deposit", value: parseEther(amt || "0") })} disabled={!isConnected || busy || !(Number(amt) > 0)} className={`w-full py-4 font-bold rounded-2xl bg-gradient-to-r from-${c}-500 to-${c}-600 text-white hover:opacity-90 disabled:opacity-40 shadow-lg shadow-${c}-500/20`}>{!isConnected ? "Connect wallet" : busy ? "Confirming…" : !(Number(amt) > 0) ? "Enter an amount" : `Deposit & earn ${apyPct}%`}</button>
      </div> : <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="text-sm text-gray-400">Withdraw your full position — principal plus all accrued interest.</div>
        <div className="text-3xl font-black">${usd(bal as bigint, 4)}</div>
        <button onClick={() => writeContract({ address: VAULT, abi: ABI, functionName: "withdraw" })} disabled={!isConnected || busy || !hasPos} className={`w-full py-4 font-bold rounded-2xl bg-gradient-to-r from-${c}-500 to-${c}-600 text-white hover:opacity-90 disabled:opacity-40 shadow-lg shadow-${c}-500/20`}>{!isConnected ? "Connect wallet" : busy ? "Confirming…" : !hasPos ? "Nothing to withdraw" : "Withdraw all + interest"}</button>
      </div>}
      <p className="text-[11px] text-gray-600 text-center">Interest accrues every second · no lockup · withdraw anytime.</p>
    </div>
  );
}
