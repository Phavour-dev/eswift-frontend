import { Buffer } from "buffer";
import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import BN from "bn.js";

const PROGRAM_ID = new PublicKey("BHVRj3va6pdvTbArbeM7Vvqc1hdrK78msDkHrDwb8w9V");
const WL_PROGRAM_ID = new PublicKey("9ip7pDxZe45kck5ZBTFu8q7HZa51g1v11bvnGpZhEhJZ");
const ARBITER_PUBKEY = new PublicKey("9hYM4ybCP4arzPZxKBUjUCRr5BeJUoCCVybcUTtNg8uX");
const network = "https://devnet.helius-rpc.com/?api-key=0b414f3a-c0a5-4972-b27c-2763bb414914";
const NATIVE_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const MAKE_DISCRIMINATOR = [138, 227, 232, 77, 223, 166, 96, 197];
const TAKE_DISCRIMINATOR = [149, 226, 52, 104, 6, 142, 230, 39];
const CANCEL_DISCRIMINATOR = [232, 219, 223, 41, 219, 236, 220, 190];
const WL_LIST_DISCRIMINATOR = [54, 174, 193, 67, 17, 41, 132, 38];
const WL_LOCK_DISCRIMINATOR = [21, 19, 208, 43, 237, 62, 255, 87];
const WL_CONFIRM_DISCRIMINATOR = [174, 1, 15, 213, 3, 190, 131, 0];
const WL_DISPUTE_DISCRIMINATOR = [216, 92, 128, 146, 202, 85, 135, 73];
const WL_CANCEL_DISCRIMINATOR = [232, 219, 223, 41, 219, 236, 220, 190];
const WL_RESOLVE_DISCRIMINATOR = [231, 6, 202, 6, 96, 103, 12, 230];

const S = {
  input: { flex: 1, background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 6, padding: "11px 15px", color: "#e0e0e0", fontSize: 13.5, outline: "none", fontFamily: "'Inter', sans-serif", minWidth: 0, transition: "border-color 0.2s, box-shadow 0.2s" },
  select: { flex: 1, background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 6, padding: "11px 34px 11px 15px", color: "#e0e0e0", fontSize: 13.5, outline: "none", fontFamily: "'Inter', sans-serif", minWidth: 0, cursor: "pointer", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", transition: "border-color 0.2s" },
  btn: (bg, color, borderColor) => ({ background: bg, color: color, fontWeight: 500, border: `1px solid ${borderColor || "#2a2a2a"}`, cursor: "pointer", padding: "10px 18px", fontSize: 13, fontFamily: "'Inter', sans-serif", borderRadius: 6, transition: "all 0.2s", letterSpacing: "0.2px" }),
  pill: (active) => ({ padding: "7px 15px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, background: active ? "#fff" : "#0f0f0f", color: active ? "#000" : "#999", border: active ? "1px solid #fff" : "1px solid #1f1f1f", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }),
  badge: (color) => ({ fontSize: 10.5, padding: "3px 10px", borderRadius: 4, fontWeight: 500, background: `${color}14`, color: color, border: `1px solid ${color}30`, fontFamily: "'Inter', sans-serif" }),
  card: { background: "#0c0c0c", border: "1px solid #1c1c1c", borderRadius: 8, padding: 22, transition: "border-color 0.2s" },
  label: { fontSize: 10.5, color: "#777", marginBottom: 5, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: "'Inter', sans-serif" },
};

function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      {toasts.map((t) => {
        const c = t.type === "success" ? "#fff" : t.type === "error" ? "#ef4444" : "#a3a3a3";
        return (
          <div key={t.id} onClick={() => removeToast(t.id)} style={{ background: "#111", border: `1px solid #222`, borderRadius: 8, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", animation: "slideIn 0.2s ease", cursor: "pointer", borderLeft: `3px solid ${c}`, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: c, fontFamily: "'Inter', sans-serif" }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function DisputeModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 10, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#fff", fontFamily: "'Inter', sans-serif" }}>Dispute Reason</div>
        <div style={{ fontSize: 12, color: "#777", marginBottom: 18, fontFamily: "'Inter', sans-serif" }}>Explain why you're opening this dispute. The arbiter will review it.</div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Seller never submitted my wallet to the project..." rows={3} style={{ width: "100%", ...S.input, resize: "vertical", marginBottom: 18 }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.btn("transparent", "#999", "#333")}>Cancel</button>
          <button onClick={() => { if(reason.trim()) { onSubmit(reason); onClose(); } }} style={S.btn("#fff", "#000", "#fff")}>Submit Dispute</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { publicKey, sendTransaction, signTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [escrowPda, setEscrowPda] = useState(null);
  const [tab, setTab] = useState("create");
  const [lockAmount, setLockAmount] = useState("");
  const [wantAmount, setWantAmount] = useState("");
  const [lockToken, setLockToken] = useState("");
  const [wantToken, setWantToken] = useState("");
  const [allEscrows, setAllEscrows] = useState([]);
  const [wlRole, setWlRole] = useState("seller");
  const [wlAmount, setWlAmount] = useState("");
  const [wlId, setWlId] = useState("1");
  const [wlProjectName, setWlProjectName] = useState("");
  const [wlAllocationType, setWlAllocationType] = useState("GTD");
  const [wlQuantity, setWlQuantity] = useState("1");
  const [wlPriceType, setWlPriceType] = useState("per-spot");
  const [wlPaymentToken, setWlPaymentToken] = useState("SOL");
  const [wlCustomMint, setWlCustomMint] = useState("");
  const [wlProjectLink, setWlProjectLink] = useState("");
  const [allWlEscrows, setAllWlEscrows] = useState([]);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const isArbiter = publicKey && publicKey.equals(ARBITER_PUBKEY);

  const connection = new Connection(network, "confirmed");
  const addToast = useCallback((type, message) => { const id = Date.now()+Math.random(); setToasts(p=>[...p,{id,type,message}]); setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500); },[]);
  const removeToast = useCallback((id) => setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const addLog = (msg) => { const t=msg.startsWith("✅")?"success":msg.startsWith("❌")?"error":"warn"; addToast(t,msg.replace(/[✅❌]/g,"").trim()); };
  const getWlMintAddress = () => { if(wlPaymentToken==="SOL")return NATIVE_SOL_MINT; if(wlPaymentToken==="USDC")return USDC_DEVNET_MINT; if(wlPaymentToken==="SPL"&&wlCustomMint)return new PublicKey(wlCustomMint); return null; };
  const getPaymentLabel = (mint) => { if(!mint)return"???"; if(mint.equals(NATIVE_SOL_MINT))return"SOL"; if(mint.equals(USDC_DEVNET_MINT))return"USDC"; return mint.toBase58().slice(0,6)+"..."; };

  const fetchEscrows = async () => { try { const a=await connection.getProgramAccounts(PROGRAM_ID,{filters:[{memcmp:{offset:0,bytes:"6Kq5Q7N59ES"}}]}); setAllEscrows(a.map(({pubkey,account})=>{const d=account.data;return{pubkey,maker:new PublicKey(d.slice(8,40)),mintA:new PublicKey(d.slice(40,72)),mintB:new PublicKey(d.slice(72,104)),amountA:new BN(d.slice(104,112),"le"),amountB:new BN(d.slice(112,120),"le")};})); }catch(e){console.error(e);} };
  const fetchWlEscrows = async () => { try { const a=await connection.getProgramAccounts(WL_PROGRAM_ID); const p=[]; for(const{pubkey,account}of a){try{const d=account.data;if(d.length<123)continue;p.push({pubkey,maker:new PublicKey(d.slice(8,40)),taker:new PublicKey(d.slice(40,72)),mint:new PublicKey(d.slice(72,104)),amount:new BN(d.slice(104,112),"le"),id:new BN(d.slice(112,120),"le"),role:d[120]===0?"seller":"buyer",status:d[121]});}catch(e){}} setAllWlEscrows(p); }catch(e){console.error(e);} };
  useEffect(()=>{if(connected){fetchEscrows();fetchWlEscrows();}},[connected]);
  useEffect(()=>{if(connected&&tab==="services")fetchWlEscrows();if(connected&&tab!=="services")fetchEscrows();},[tab]);

  const signAndSend = async (tx) => {
    if (!publicKey) throw new Error("Not connected");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;
    
    try {
      if (signTransaction) {
        const signed = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
        return sig;
      }
    } catch (e) {
      console.log("signTransaction failed, trying sendTransaction:", e.message);
    }
    
    if (sendTransaction) {
      return await sendTransaction(tx, connection, { skipPreflight: false, preflightCommitment: "confirmed" });
    }
    throw new Error("No signing method available");
};

  const createEscrow = async () => { if(!publicKey||!lockToken||!wantToken||!lockAmount||!wantAmount)return addLog("❌ Fill all fields"); setLoading(true); try { const mA=new PublicKey(lockToken),mB=new PublicKey(wantToken); const ata=await getAssociatedTokenAddress(mA,publicKey); const[ep]=PublicKey.findProgramAddressSync([Buffer.from("escrow"),publicKey.toBuffer()],PROGRAM_ID); const v=await getAssociatedTokenAddress(mA,ep,true); const d=Buffer.concat([Buffer.from(MAKE_DISCRIMINATOR),new BN(Number(lockAmount)*1_000_000).toArrayLike(Buffer,"le",8),new BN(Number(wantAmount)*1_000_000).toArrayLike(Buffer,"le",8)]); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:mA,isSigner:false,isWritable:false},{pubkey:mB,isSigner:false,isWritable:false},{pubkey:ata,isSigner:false,isWritable:true},{pubkey:v,isSigner:false,isWritable:true},{pubkey:ep,isSigner:false,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:PROGRAM_ID,data:d}))); setEscrowPda(ep); addLog("✅ Escrow created! "+sig); fetchEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const takeEscrow = async (esc) => { if(!publicKey)return addLog("❌ Connect wallet"); setLoading(true); try { const tAA=await getAssociatedTokenAddress(esc.mintA,publicKey),tAB=await getAssociatedTokenAddress(esc.mintB,publicKey),mAB=await getAssociatedTokenAddress(esc.mintB,esc.maker),v=await getAssociatedTokenAddress(esc.mintA,esc.pubkey,true); const d=Buffer.from(TAKE_DISCRIMINATOR); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:esc.maker,isSigner:false,isWritable:true},{pubkey:esc.pubkey,isSigner:false,isWritable:true},{pubkey:esc.mintA,isSigner:false,isWritable:false},{pubkey:esc.mintB,isSigner:false,isWritable:false},{pubkey:v,isSigner:false,isWritable:true},{pubkey:tAA,isSigner:false,isWritable:true},{pubkey:tAB,isSigner:false,isWritable:true},{pubkey:mAB,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:PROGRAM_ID,data:d}))); addLog("✅ Escrow taken! "+sig); fetchEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const cancelEscrow = async () => { if(!publicKey||!escrowPda||!lockToken)return addLog("❌ Nothing to cancel"); setLoading(true); try { const mA=new PublicKey(lockToken),ata=await getAssociatedTokenAddress(mA,publicKey),v=await getAssociatedTokenAddress(mA,escrowPda,true); const d=Buffer.from(CANCEL_DISCRIMINATOR); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:escrowPda,isSigner:false,isWritable:true},{pubkey:mA,isSigner:false,isWritable:false},{pubkey:v,isSigner:false,isWritable:true},{pubkey:ata,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:PROGRAM_ID,data:d}))); setEscrowPda(null); addLog("✅ Cancelled! "+sig); fetchEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const createWlListing = async () => { const mint=getWlMintAddress(); if(!publicKey||!mint||!wlAmount||!wlId)return addLog("❌ Fill all fields"); setLoading(true); try { const total=wlPriceType==="per-spot"?Number(wlAmount)*Number(wlQuantity):Number(wlAmount); const idB=new BN(wlId).toArrayLike(Buffer,"le",8); const[ep]=PublicKey.findProgramAddressSync([Buffer.from("wl-escrow"),publicKey.toBuffer(),idB],WL_PROGRAM_ID); const v=await getAssociatedTokenAddress(mint,ep,true); const d=Buffer.concat([Buffer.from(WL_LIST_DISCRIMINATOR),new BN(total*1_000_000).toArrayLike(Buffer,"le",8),Buffer.from([wlRole==="seller"?0:1]),Buffer.from(idB)]); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:v,isSigner:false,isWritable:true},{pubkey:ep,isSigner:false,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:WL_PROGRAM_ID,data:d}))); localStorage.setItem("wl_meta_"+ep.toBase58(),JSON.stringify({projectName:wlProjectName,allocationType:wlAllocationType,quantity:wlQuantity,priceType:wlPriceType,projectLink:wlProjectLink})); addLog("✅ WL #"+wlId+" created! "+sig); fetchWlEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const lockWlPayment = async (esc) => {
    console.log("Lock attempted by:", publicKey?.toBase58());
    if (!publicKey) return addLog("❌ Connect wallet!");
    setLoading(true);
    try {
      const ata = await getAssociatedTokenAddress(esc.mint, publicKey), vault = await getAssociatedTokenAddress(esc.mint, esc.pubkey, true);
      const data = Buffer.from(WL_LOCK_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:esc.mint, isSigner:false, isWritable:false },{ pubkey:esc.pubkey, isSigner:false, isWritable:true },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:ata, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:ASSOCIATED_TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:SystemProgram.programId, isSigner:false, isWritable:false }];
      const sig = await signAndSend(new Transaction().add(new TransactionInstruction({ keys, programId: WL_PROGRAM_ID, data })));
      addLog("✅ Locked! " + sig); fetchWlEscrows();
    } catch (e) { addLog("❌ " + e.message); }
    setLoading(false);
  };
  const confirmWl = async (esc) => { if(!publicKey)return addLog("❌ Connect wallet"); setLoading(true); try { const seller=esc.role==="seller"?esc.maker:esc.taker; const sAta=await getAssociatedTokenAddress(esc.mint,seller),v=await getAssociatedTokenAddress(esc.mint,esc.pubkey,true); const d=Buffer.from(WL_CONFIRM_DISCRIMINATOR); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:seller,isSigner:false,isWritable:true},{pubkey:esc.mint,isSigner:false,isWritable:false},{pubkey:esc.pubkey,isSigner:false,isWritable:true},{pubkey:v,isSigner:false,isWritable:true},{pubkey:sAta,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:WL_PROGRAM_ID,data:d}))); addLog("✅ Confirmed! "+sig); fetchWlEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const disputeWl = async (esc, reason) => { if(!publicKey)return addLog("❌ Connect wallet"); setLoading(true); try { const v=await getAssociatedTokenAddress(esc.mint,esc.pubkey,true); const d=Buffer.from(WL_DISPUTE_DISCRIMINATOR); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:esc.mint,isSigner:false,isWritable:false},{pubkey:esc.pubkey,isSigner:false,isWritable:true},{pubkey:v,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:WL_PROGRAM_ID,data:d}))); localStorage.setItem("wl_dispute_"+esc.pubkey.toBase58(),reason); addLog("✅ Disputed! Arbiter notified. "+sig); fetchWlEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const resolveDispute = async (esc, paySeller) => { if(!publicKey)return; setLoading(true); try { const seller=esc.role==="seller"?esc.maker:esc.taker; const buyer=esc.role==="seller"?esc.taker:esc.maker; const sAta=await getAssociatedTokenAddress(esc.mint,seller),bAta=await getAssociatedTokenAddress(esc.mint,buyer),v=await getAssociatedTokenAddress(esc.mint,esc.pubkey,true); const d=Buffer.concat([Buffer.from(WL_RESOLVE_DISCRIMINATOR),Buffer.from([paySeller?1:0])]); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:esc.mint,isSigner:false,isWritable:false},{pubkey:seller,isSigner:false,isWritable:true},{pubkey:buyer,isSigner:false,isWritable:true},{pubkey:esc.pubkey,isSigner:false,isWritable:true},{pubkey:v,isSigner:false,isWritable:true},{pubkey:sAta,isSigner:false,isWritable:true},{pubkey:bAta,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:WL_PROGRAM_ID,data:d}))); addLog("✅ Resolved! "+(paySeller?"Paid seller":"Refunded buyer")+" "+sig); fetchWlEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };
  const cancelWlListing = async (esc) => { if(!publicKey)return; setLoading(true); try { const v=await getAssociatedTokenAddress(esc.mint,esc.pubkey,true); const d=Buffer.from(WL_CANCEL_DISCRIMINATOR); const k=[{pubkey:publicKey,isSigner:true,isWritable:true},{pubkey:esc.pubkey,isSigner:false,isWritable:true},{pubkey:v,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}]; const sig=await signAndSend(new Transaction().add(new TransactionInstruction({keys:k,programId:WL_PROGRAM_ID,data:d}))); localStorage.removeItem("wl_meta_"+esc.pubkey.toBase58()); addLog("✅ Cancelled! "+sig); fetchWlEscrows(); }catch(e){addLog("❌ "+e.message);} setLoading(false); };

  const baseTabs = [{ key: "create", label: "Create" },{ key: "explore", label: "Explore" },{ key: "my", label: "My" },{ key: "services", label: "WL" }];
  const tabs = isArbiter ? [...baseTabs, { key: "arbiter", label: "Arbiter" }] : baseTabs;

  return (
    <div className="grain-bg" style={{ minHeight: "100vh", background: "#080808", color: "#d4d4d4", fontFamily: "'Inter', sans-serif", position: "relative", isolation: "isolate" }}>
      <style>{`
        @keyframes slideIn { from { opacity:0;transform:translateX(80px) } to { opacity:1;transform:translateX(0) } }
        input:focus, select:focus, textarea:focus { border-color: #fff !important; box-shadow: 0 0 0 3px rgba(255,255,255,0.04) !important; }
        select option { background: #111; color: #d4d4d4; }
        .hide-mobile { display: flex; } .hide-desktop { display: none; }
        .grain-bg::before {
          content: "";
          position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.18;
          background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAABYSURBVHja7MoxDYAwEATBPQLw/1+MwQJIKZg3K6m7iM7ZkaSJEn/QpIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZL0twMAAP//AwBmHUmcNnKzGQAAAABJRU5ErkJggg==");
          background-repeat: repeat; background-size: 100px 100px;
        }
        @media (max-width: 768px) { .hide-mobile { display: none !important; } .hide-desktop { display: flex !important; } }
      `}</style>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {disputeTarget && <DisputeModal onClose={() => setDisputeTarget(null)} onSubmit={(reason) => disputeWl(disputeTarget, reason)} />}

      <div style={{ position: "relative", zIndex: 1 }}>
        <nav style={{ borderBottom: "1px solid #1a1a1a", position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.85)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 15.5, letterSpacing: "-0.3px", color: "#fff" }}>Eswift</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="hide-desktop" onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>{mobileMenu ? "✕" : "☰"}</button>
            <WalletMultiButton style={{ background: "#fff", color: "#000", fontWeight: 500, fontSize: 12.5, padding: "9px 18px", borderRadius: 6, border: "none", fontFamily: "'Inter', sans-serif", cursor: "pointer" }} />
          </div>
        </nav>
        {mobileMenu && <div className="hide-desktop" style={{ background: "#080808", borderBottom: "1px solid #1a1a1a", padding: "10px 20px", display: "flex", flexDirection: "column", gap: 6 }}>{tabs.map(t=><button key={t.key} onClick={()=>{setTab(t.key);setMobileMenu(false);}} style={{background:"none",border:"none",color:tab===t.key?"#fff":"#888",padding:"8px 0",textAlign:"left",fontSize:13,cursor:"pointer",fontFamily:"'Inter', sans-serif"}}>{t.label}</button>)}</div>}

        <div className="hide-mobile" style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid #1a1a1a" }}>{tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{padding:"14px 30px",fontSize:12.5,fontWeight:500,background:"none",border:"none",cursor:"pointer",color:tab===t.key?"#fff":"#777",borderBottom:tab===t.key?"1.5px solid #fff":"1.5px solid transparent",transition:"all 0.2s",fontFamily:"'Inter', sans-serif"}}>{t.label}</button>)}</div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 16px 60px" }}>
          {!connected && <div style={{ textAlign: "center", padding: 80 }}><div style={{ fontSize: 24, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "-0.5px" }}>Eswift</div><div style={{ color: "#888", fontSize: 13.5 }}>Connect your wallet to get started</div></div>}

          {/* ====== ALL TABS UNCHANGED ====== */}
          {connected && tab === "create" && (
            <div style={S.card}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 22, letterSpacing: "-0.3px" }}>Create Token Escrow</div>
              <div style={{ marginBottom: 14 }}><div style={S.label}>Token You Lock (Mint Address)</div><input placeholder="Mint address" value={lockToken} onChange={e=>setLockToken(e.target.value)} style={S.input} /></div>
              <div style={{ marginBottom: 14 }}><div style={S.label}>Amount to Lock</div><input placeholder="Amount" value={lockAmount} onChange={e=>setLockAmount(e.target.value)} style={S.input} /></div>
              <div style={{ marginBottom: 14 }}><div style={S.label}>Token You Want (Mint Address)</div><input placeholder="Mint address" value={wantToken} onChange={e=>setWantToken(e.target.value)} style={S.input} /></div>
              <div style={{ marginBottom: 20 }}><div style={S.label}>Amount You Want</div><input placeholder="Amount" value={wantAmount} onChange={e=>setWantAmount(e.target.value)} style={S.input} /></div>
              {lockAmount&&wantAmount&&<div style={{ background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:6,padding:"12px 16px",marginBottom:20,fontSize:12.5,color:"#999",display:"flex",justifyContent:"space-between" }}><span>Rate</span><span style={{color:"#fff",fontWeight:500}}>1 : {(Number(wantAmount)/Number(lockAmount)).toFixed(4)}</span></div>}
              <button onClick={createEscrow} disabled={loading||!lockToken||!wantToken||!lockAmount||!wantAmount} style={{...S.btn("#fff","#000","#fff"),width:"100%",padding:"12px",fontSize:14,opacity:(loading||!lockToken)?0.35:1}}>Create Escrow</button>
              {escrowPda&&<button onClick={cancelEscrow} disabled={loading} style={{...S.btn("transparent","#ef4444","#ef4444"),width:"100%",padding:"11px",marginTop:8,fontSize:13.5}}>Cancel Escrow</button>}
            </div>
          )}
          {connected && tab === "explore" && (
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}><div style={{fontSize:15,fontWeight:600,color:"#fff",letterSpacing:"-0.3px"}}>Explore</div><button onClick={fetchEscrows} style={{...S.btn("#0f0f0f","#999","#1f1f1f"),padding:"7px 15px",fontSize:12}}>Refresh</button></div>
              {allEscrows.length===0&&<div style={{color:"#888",textAlign:"center",padding:40,fontSize:13}}>No escrows</div>}
              {allEscrows.map((esc,i)=><div key={i} style={{...S.card,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:10.5,color:"#888",marginBottom:4,fontFamily:"monospace"}}>{esc.pubkey.toBase58().slice(0,10)}...</div><div style={{fontSize:13.5,fontWeight:500}}>Locked: {esc.amountA.div(new BN(1_000_000)).toString()} Token A</div><div style={{fontSize:13.5,fontWeight:500}}>Wants: {esc.amountB.div(new BN(1_000_000)).toString()} Token B</div></div><button onClick={()=>takeEscrow(esc)} disabled={loading||esc.maker.equals(publicKey)} style={{...S.btn(esc.maker.equals(publicKey)?"#0f0f0f":"#fff",esc.maker.equals(publicKey)?"#888":"#000",esc.maker.equals(publicKey)?"#1f1f1f":"#fff"),padding:"9px 18px",fontSize:12.5}}>{esc.maker.equals(publicKey)?"Yours":"Take"}</button></div>)}
            </div>
          )}
          {connected && tab === "my" && (
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:20,letterSpacing:"-0.3px"}}>My Escrows</div>
              {allEscrows.filter(e=>e.maker.equals(publicKey)).length===0&&<div style={{color:"#888",textAlign:"center",padding:40,fontSize:13}}>None</div>}
              {allEscrows.filter(e=>e.maker.equals(publicKey)).map((esc,i)=><div key={i} style={{...S.card,marginBottom:10}}><div style={{fontSize:13.5,fontWeight:500}}>Locked: {esc.amountA.div(new BN(1_000_000)).toString()} Token A</div><div style={{fontSize:13.5,fontWeight:500,marginBottom:14}}>Wants: {esc.amountB.div(new BN(1_000_000)).toString()} Token B</div><button onClick={()=>{setEscrowPda(esc.pubkey);setLockToken(esc.mintA.toBase58());cancelEscrow();}} disabled={loading} style={{...S.btn("transparent","#ef4444","#ef4444"),padding:"8px 18px",fontSize:12.5}}>Cancel</button></div>)}
            </div>
          )}
          {connected && tab === "services" && (
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:20,letterSpacing:"-0.3px"}}>Whitelist Services</div>
              <div style={{...S.card,marginBottom:24}}>
                <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:16}}>Create Listing</div>
                <div style={{marginBottom:12}}><div style={S.label}>I am</div><div style={{display:"flex",gap:6}}><button onClick={()=>setWlRole("seller")} style={S.pill(wlRole==="seller")}>Selling WL</button><button onClick={()=>setWlRole("buyer")} style={S.pill(wlRole==="buyer")}>Looking for WL</button></div></div>
                <div style={{marginBottom:12}}><div style={S.label}>Project Name</div><input placeholder="e.g. Mad Lads" value={wlProjectName} onChange={e=>setWlProjectName(e.target.value)} style={S.input} /></div>
                <div style={{marginBottom:12}}><div style={S.label}>Allocation</div><div style={{display:"flex",gap:6}}><button onClick={()=>setWlAllocationType("GTD")} style={S.pill(wlAllocationType==="GTD")}>GTD</button><button onClick={()=>setWlAllocationType("FCFS")} style={S.pill(wlAllocationType==="FCFS")}>FCFS</button></div></div>
                <div style={{display:"flex",gap:8,marginBottom:12}}><div style={{flex:1}}><div style={S.label}>Quantity</div><input placeholder="1" value={wlQuantity} onChange={e=>setWlQuantity(e.target.value)} style={S.input} /></div><div style={{flex:1}}><div style={S.label}>Listing ID</div><input placeholder="1" value={wlId} onChange={e=>setWlId(e.target.value)} style={S.input} /></div></div>
                <div style={{marginBottom:12}}><div style={S.label}>Price Type</div><div style={{display:"flex",gap:6}}><button onClick={()=>setWlPriceType("per-spot")} style={S.pill(wlPriceType==="per-spot")}>Per Spot</button><button onClick={()=>setWlPriceType("total")} style={S.pill(wlPriceType==="total")}>Total</button></div></div>
                <div style={{display:"flex",gap:8,marginBottom:12}}><div style={{flex:1}}><div style={S.label}>Price</div><input placeholder="5" value={wlAmount} onChange={e=>setWlAmount(e.target.value)} style={S.input} /></div><div style={{flex:1}}><div style={S.label}>Token</div><select value={wlPaymentToken} onChange={e=>{setWlPaymentToken(e.target.value);if(e.target.value!=="SPL")setWlCustomMint("");}} style={S.select}><option value="SOL">SOL</option><option value="USDC">USDC</option><option value="SPL">SPL</option></select></div></div>
                {wlPaymentToken==="SPL"&&<div style={{marginBottom:12}}><div style={S.label}>SPL Mint</div><input placeholder="Mint address" value={wlCustomMint} onChange={e=>setWlCustomMint(e.target.value)} style={S.input} /></div>}
                <div style={{marginBottom:16}}><div style={S.label}>Project Link</div><input placeholder="https://x.com/..." value={wlProjectLink} onChange={e=>setWlProjectLink(e.target.value)} style={S.input} /></div>
                {wlAmount&&<div style={{background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:6,padding:"12px 16px",marginBottom:16,fontSize:12,color:"#999"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span>Price</span><span style={{color:"#fff",fontWeight:500}}>{wlAmount} {wlPaymentToken} {wlPriceType==="per-spot"&&`× ${wlQuantity}`}</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span>Total</span><span style={{color:"#fff",fontWeight:500}}>{wlPriceType==="per-spot"?(Number(wlAmount)*Number(wlQuantity)).toFixed(2):Number(wlAmount).toFixed(2)} {wlPaymentToken}</span></div></div>}
                <button onClick={createWlListing} disabled={loading||!wlAmount||!wlId} style={{...S.btn("#fff","#000","#fff"),width:"100%",padding:"12px",fontSize:14,opacity:(loading||!wlAmount)?0.35:1}}>Create WL Listing</button>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>Browse</div><button onClick={fetchWlEscrows} style={{...S.btn("#0f0f0f","#999","#1f1f1f"),padding:"7px 15px",fontSize:12}}>Refresh</button></div>
              {allWlEscrows.length===0&&<div style={{color:"#888",textAlign:"center",padding:30,fontSize:13}}>No listings</div>}
              {allWlEscrows.map((esc,i)=>{const isMaker=esc.maker.equals(publicKey);const buyer=esc.role==="seller"?esc.taker:esc.maker;const iAmBuyer=buyer.equals(publicKey);const meta=JSON.parse(localStorage.getItem("wl_meta_"+esc.pubkey.toBase58())||"{}");const disputeReason=localStorage.getItem("wl_dispute_"+esc.pubkey.toBase58());
              return (<div key={i} style={{...S.card,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={S.badge(esc.role==="seller"?"#22c55e":"#3b82f6")}>{esc.role==="seller"?"Sell":"Buy"}</span>
                    <span style={S.badge(esc.status===0?"#facc15":esc.status===1?"#a855f7":"#ef4444")}>{esc.status===0?"Open":esc.status===1?"Locked":"Disputed"}</span>
                    <span style={{fontSize:10.5,color:"#888"}}>#{esc.id?.toString()||"?"}</span>
                  </div>
                  <div style={{fontSize:13.5,fontWeight:600,color:"#fff"}}>{esc.amount.div(new BN(1_000_000)).toString()} {getPaymentLabel(esc.mint)}</div>
                </div>
                {meta.projectName&&<div style={{marginBottom:6,padding:"10px 12px",background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:6}}><div style={{fontSize:12.5,fontWeight:600,color:"#d4d4d4"}}>{meta.projectName}</div><div style={{fontSize:11,color:"#999",marginTop:2}}>{meta.allocationType} · {meta.quantity||1} spot(s) · {meta.priceType==="per-spot"?"Per spot":"Total"}</div></div>}
                {esc.status===2&&disputeReason&&<div style={{marginBottom:6,padding:"10px 12px",background:"#0f0f0f",border:"1px solid #ef444430",borderRadius:6}}><div style={{fontSize:10.5,color:"#ef4444",marginBottom:2}}>DISPUTE REASON</div><div style={{fontSize:11.5,color:"#aaa"}}>{disputeReason}</div></div>}
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  {esc.status===0&&((esc.role==="buyer"&&isMaker)||(esc.role==="seller"&&!isMaker))&&<button onClick={()=>lockWlPayment(esc)} disabled={loading} style={{...S.btn("#fff","#000","#fff"),padding:"8px 16px",fontSize:12}}>Lock Payment</button>}
                  {isMaker&&esc.status===0&&<button onClick={()=>cancelWlListing(esc)} disabled={loading} style={{...S.btn("transparent","#ef4444","#ef4444"),padding:"8px 16px",fontSize:12}}>Cancel</button>}
                  {esc.status===1&&iAmBuyer&&<><button onClick={()=>confirmWl(esc)} disabled={loading} style={{...S.btn("#fff","#000","#fff"),padding:"8px 16px",fontSize:12}}>Confirm</button><button onClick={()=>setDisputeTarget(esc)} disabled={loading} style={{...S.btn("transparent","#ef4444","#ef4444"),padding:"8px 16px",fontSize:12}}>Dispute</button></>}
                </div>
              </div>);})}
            </div>
          )}
          {connected && tab === "arbiter" && isArbiter && (
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:20,letterSpacing:"-0.3px"}}>Arbiter Dashboard</div>
              {allWlEscrows.filter(e=>e.status===2).length===0&&<div style={{color:"#888",textAlign:"center",padding:40,fontSize:13}}>No disputes</div>}
              {allWlEscrows.filter(e=>e.status===2).map((esc,i)=>{const seller=esc.role==="seller"?esc.maker:esc.taker;const buyer=esc.role==="seller"?esc.taker:esc.maker;const meta=JSON.parse(localStorage.getItem("wl_meta_"+esc.pubkey.toBase58())||"{}");const disputeReason=localStorage.getItem("wl_dispute_"+esc.pubkey.toBase58());
              return (<div key={i} style={{...S.card,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={S.badge("#ef4444")}>Disputed</span><span style={{fontSize:13.5,fontWeight:600,color:"#fff"}}>{esc.amount.div(new BN(1_000_000)).toString()} {getPaymentLabel(esc.mint)}</span></div>
                {meta.projectName&&<div style={{fontSize:12,color:"#999",marginBottom:4}}>Project: {meta.projectName}</div>}
                <div style={{fontSize:10.5,color:"#888",marginBottom:8,fontFamily:"monospace"}}>Seller: {seller.toBase58().slice(0,8)}... &nbsp;Buyer: {buyer.toBase58().slice(0,8)}...</div>
                {disputeReason&&<div style={{marginBottom:10,padding:"10px 12px",background:"#0f0f0f",border:"1px solid #ef444430",borderRadius:6}}><div style={{fontSize:10.5,color:"#ef4444",marginBottom:2}}>REASON</div><div style={{fontSize:11.5,color:"#aaa"}}>{disputeReason}</div></div>}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>resolveDispute(esc,true)} disabled={loading} style={{...S.btn("#fff","#000","#fff"),padding:"9px 18px",fontSize:12}}>Pay Seller</button>
                  <button onClick={()=>resolveDispute(esc,false)} disabled={loading} style={{...S.btn("transparent","#ef4444","#ef4444"),padding:"9px 18px",fontSize:12}}>Refund Buyer</button>
                </div>
              </div>);})}
            </div>
          )}
        </div>
        <div style={{borderTop:"1px solid #1a1a1a",padding:"14px",textAlign:"center",color:"#666",fontSize:11.5}}>Eswift</div>
      </div>
    </div>
  );
}
export default App;