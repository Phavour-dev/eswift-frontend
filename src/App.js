import { Buffer } from "buffer";
import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import BN from "bn.js";

const PROGRAM_ID = new PublicKey("BHVRj3va6pdvTbArbeM7Vvqc1hdrK78msDkHrDwb8w9V");
const WL_PROGRAM_ID = new PublicKey("9ip7pDxZe45kck5ZBTFu8q7HZa51g1v11bvnGpZhEhJZ");
const network = "https://api.devnet.solana.com";
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

// ========== STYLES ==========
const styles = {
  glass: { background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24 },
  btnPrimary: { background: "linear-gradient(135deg, #fff 0%, #e5e5e5 100%)", color: "#000", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s", borderRadius: 14 },
  btnDanger: { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s", borderRadius: 14 },
  btnSuccess: { background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#000", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s", borderRadius: 14 },
  input: { 
    flex: 1, 
    background: "rgba(12,14,20,0.8)", 
    border: "1px solid rgba(255,255,255,0.06)", 
    borderRadius: 16, 
    padding: "15px 20px", 
    color: "#fff", 
    fontSize: 15, 
    outline: "none", 
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", 
    minWidth: 0,
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },
  select: {
    flex: 1,
    background: "rgba(12,14,20,0.8)", 
    border: "1px solid rgba(255,255,255,0.06)", 
    borderRadius: 16, 
    padding: "15px 36px 15px 20px", 
    color: "#fff", 
    fontSize: 15, 
    outline: "none", 
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", 
    minWidth: 0,
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
    cursor: "pointer",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    backgroundSize: "12px",
  },
  pill: (active) => ({ padding: "8px 18px", borderRadius: 999, fontSize: 13, fontWeight: 500, background: active ? "#fff" : "rgba(255,255,255,0.04)", color: active ? "#000" : "rgba(255,255,255,0.6)", border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }),
  badge: (color) => ({ fontSize: 11, padding: "3px 12px", borderRadius: 999, fontWeight: 600, background: `rgba(${color},0.12)`, color: `rgb(${color})` }),
};

// ========== TOAST COMPONENT ==========
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 380 }}>
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const border = isSuccess ? "rgba(34,197,94,0.3)" : isError ? "rgba(239,68,68,0.3)" : "rgba(250,204,21,0.3)";
        const icon = isSuccess ? "✅" : isError ? "❌" : "⚠️";
        const textColor = isSuccess ? "#22c55e" : isError ? "#ef4444" : "#facc15";
        return (
          <div key={t.id} onClick={() => removeToast(t.id)} style={{
            background: `rgba(0,0,0,0.9)`, backdropFilter: "blur(20px)",
            border: `1px solid ${border}`, borderRadius: 14, padding: "14px 18px",
            display: "flex", gap: 12, alignItems: "center",
            animation: "slideIn 0.3s ease, fadeOut 0.3s ease 3.7s forwards",
            cursor: "pointer", boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
            borderLeft: `3px solid ${isSuccess ? "#22c55e" : isError ? "#ef4444" : "#facc15"}`,
          }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 2 }}>{isSuccess ? "Success" : isError ? "Error" : "Warning"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", wordBreak: "break-word" }}>{t.message}</div>
            </div>
          </div>
        );
      })}
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
  const [wlMint, setWlMint] = useState("");
  const [wlId, setWlId] = useState("1");
  const [wlProjectName, setWlProjectName] = useState("");
  const [wlAllocationType, setWlAllocationType] = useState("GTD");
  const [wlQuantity, setWlQuantity] = useState("1");
  const [wlPriceType, setWlPriceType] = useState("per-spot");
  const [wlPaymentToken, setWlPaymentToken] = useState("SOL");
  const [wlCustomMint, setWlCustomMint] = useState("");
  const [wlProjectLink, setWlProjectLink] = useState("");
  const [allWlEscrows, setAllWlEscrows] = useState([]);
  const [feed, setFeed] = useState([
    { text: "Escrow #4921 completed · 100 Token A", time: "1 min ago" },
    { text: "WL spot confirmed · 34 tokens released", time: "2 min ago" },
    { text: "New escrow created · 50 Token A locked", time: "5 min ago" },
  ]);

  const connection = new Connection(network, "confirmed");

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = { success: (msg) => addToast("success", msg), error: (msg) => addToast("error", msg), warn: (msg) => addToast("warn", msg) };

  const addLog = (msg) => {
    if (msg.startsWith("✅")) toast.success(msg.replace("✅ ", ""));
    else if (msg.startsWith("❌")) toast.error(msg.replace("❌ ", ""));
    else toast.warn(msg);
    setFeed((prev) => [{ text: msg.replace("✅ ", "").replace("❌ ", ""), time: "just now" }, ...prev.slice(0, 7)]);
  };

  const getWlMintAddress = () => {
    if (wlPaymentToken === "SOL") return NATIVE_SOL_MINT;
    if (wlPaymentToken === "USDC") return USDC_DEVNET_MINT;
    if (wlPaymentToken === "SPL" && wlCustomMint) return new PublicKey(wlCustomMint);
    return null;
  };

  const getPaymentLabel = (mint) => {
    if (!mint) return "???";
    if (mint.equals(NATIVE_SOL_MINT)) return "SOL";
    if (mint.equals(USDC_DEVNET_MINT)) return "USDC";
    return mint.toBase58().slice(0, 6) + "...";
  };

  const fetchEscrows = async () => {
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters: [{ memcmp: { offset: 0, bytes: "6Kq5Q7N59ES" } }] });
      const parsed = accounts.map(({ pubkey, account }) => {
        const data = account.data;
        return { pubkey, maker: new PublicKey(data.slice(8,40)), mintA: new PublicKey(data.slice(40,72)), mintB: new PublicKey(data.slice(72,104)), amountA: new BN(data.slice(104,112),"le"), amountB: new BN(data.slice(112,120),"le") };
      });
      setAllEscrows(parsed);
    } catch (err) { console.error("Fetch escrows error:", err); }
  };

  const fetchWlEscrows = async () => {
    try {
      const accounts = await connection.getProgramAccounts(WL_PROGRAM_ID);
      const parsed = [];
      for (const { pubkey, account } of accounts) {
        try {
          const data = account.data;
          if (data.length < 123) continue;
          parsed.push({ pubkey, maker: new PublicKey(data.slice(8,40)), taker: new PublicKey(data.slice(40,72)), mint: new PublicKey(data.slice(72,104)), amount: new BN(data.slice(104,112),"le"), id: new BN(data.slice(112,120),"le"), role: data[120]===0?"seller":"buyer", status: data[121]===0?"open":"locked" });
        } catch (e) {}
      }
      setAllWlEscrows(parsed);
    } catch (err) { console.error("Fetch WL escrows error:", err); }
  };

  useEffect(() => { if (connected) { fetchEscrows(); fetchWlEscrows(); } }, [connected]);
  useEffect(() => { if (connected && tab === "services") fetchWlEscrows(); if (connected && tab !== "services") fetchEscrows(); }, [tab]);

  // ===== FIXED signAndSend =====
  const signAndSend = async (tx) => {
    if (!publicKey) throw new Error("Wallet not connected");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;
    if (signTransaction) {
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
      return sig;
    }
    if (sendTransaction) {
      return await sendTransaction(tx, connection);
    }
    throw new Error("No signing method available");
  };

  // ============ ALL BUSINESS LOGIC ============
  const createEscrow = async () => {
    if (!publicKey) return addLog("❌ Connect wallet first!");
    if (!lockToken || !wantToken || !lockAmount || !wantAmount) return addLog("❌ Fill in all fields!");
    setLoading(true);
    try {
      const mintAPubkey = new PublicKey(lockToken), mintBPubkey = new PublicKey(wantToken);
      const amountA = Number(lockAmount), amountB = Number(wantAmount);
      const makerAtaA = await getAssociatedTokenAddress(mintAPubkey, publicKey);
      const [ep] = PublicKey.findProgramAddressSync([Buffer.from("escrow"), publicKey.toBuffer()], PROGRAM_ID);
      const vault = await getAssociatedTokenAddress(mintAPubkey, ep, true);
      const amountABuf = new BN(amountA*1_000_000).toArrayLike(Buffer,"le",8), amountBBuf = new BN(amountB*1_000_000).toArrayLike(Buffer,"le",8);
      const data = Buffer.concat([Buffer.from(MAKE_DISCRIMINATOR), Buffer.from(amountABuf), Buffer.from(amountBBuf)]);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:mintAPubkey, isSigner:false, isWritable:false },{ pubkey:mintBPubkey, isSigner:false, isWritable:false },{ pubkey:makerAtaA, isSigner:false, isWritable:true },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:ep, isSigner:false, isWritable:true },{ pubkey:SystemProgram.programId, isSigner:false, isWritable:false },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:ASSOCIATED_TOKEN_PROGRAM_ID, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      setEscrowPda(ep); addLog("✅ Escrow created! " + sig); fetchEscrows();
    } catch (err) { addLog("❌ " + err.message); }
    setLoading(false);
  };

  const takeEscrow = async (escrow) => {
    if (!publicKey) return addLog("❌ Connect wallet first!");
    setLoading(true);
    try {
      const takerAtaA = await getAssociatedTokenAddress(escrow.mintA, publicKey), takerAtaB = await getAssociatedTokenAddress(escrow.mintB, publicKey), makerAtaB = await getAssociatedTokenAddress(escrow.mintB, escrow.maker), vault = await getAssociatedTokenAddress(escrow.mintA, escrow.pubkey, true);
      const data = Buffer.from(TAKE_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:escrow.maker, isSigner:false, isWritable:true },{ pubkey:escrow.pubkey, isSigner:false, isWritable:true },{ pubkey:escrow.mintA, isSigner:false, isWritable:false },{ pubkey:escrow.mintB, isSigner:false, isWritable:false },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:takerAtaA, isSigner:false, isWritable:true },{ pubkey:takerAtaB, isSigner:false, isWritable:true },{ pubkey:makerAtaB, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:ASSOCIATED_TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:SystemProgram.programId, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      addLog("✅ Escrow taken! " + sig); fetchEscrows();
    } catch (err) { addLog("❌ " + err.message); }
    setLoading(false);
  };

  const cancelEscrow = async () => {
    if (!publicKey || !escrowPda || !lockToken) return addLog("❌ No escrow to cancel");
    setLoading(true);
    try {
      const mintAPubkey = new PublicKey(lockToken), makerAtaA = await getAssociatedTokenAddress(mintAPubkey, publicKey), vault = await getAssociatedTokenAddress(mintAPubkey, escrowPda, true);
      const data = Buffer.from(CANCEL_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:escrowPda, isSigner:false, isWritable:true },{ pubkey:mintAPubkey, isSigner:false, isWritable:false },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:makerAtaA, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      setEscrowPda(null); addLog("✅ Escrow cancelled! " + sig); fetchEscrows();
    } catch (err) { addLog("❌ " + err.message); }
    setLoading(false);
  };

  const createWlListing = async () => {
    const mint = getWlMintAddress();
    if (!publicKey || !mint || !wlAmount || !wlId) return addLog("❌ Fill in all fields!");
    setLoading(true);
    try {
      const totalAmount = wlPriceType==="per-spot" ? Number(wlAmount)*Number(wlQuantity) : Number(wlAmount);
      const idBuf = new BN(wlId).toArrayLike(Buffer,"le",8);
      const [ep] = PublicKey.findProgramAddressSync([Buffer.from("wl-escrow"), publicKey.toBuffer(), idBuf], WL_PROGRAM_ID);
      const vault = await getAssociatedTokenAddress(mint, ep, true);
      const amountBuf = new BN(totalAmount*1_000_000).toArrayLike(Buffer,"le",8);
      const roleByte = wlRole==="seller"?0:1;
      const data = Buffer.concat([Buffer.from(WL_LIST_DISCRIMINATOR), Buffer.from(amountBuf), Buffer.from([roleByte]), Buffer.from(idBuf)]);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:mint, isSigner:false, isWritable:false },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:ep, isSigner:false, isWritable:true },{ pubkey:SystemProgram.programId, isSigner:false, isWritable:false },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:ASSOCIATED_TOKEN_PROGRAM_ID, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: WL_PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      localStorage.setItem("wl_meta_"+ep.toBase58(), JSON.stringify({ projectName:wlProjectName, allocationType:wlAllocationType, quantity:wlQuantity, priceType:wlPriceType, projectLink:wlProjectLink }));
      addLog("✅ WL listing #"+wlId+" created! "+sig); fetchWlEscrows();
    } catch (err) { addLog("❌ "+err.message); }
    setLoading(false);
  };

  const lockWlPayment = async (escrow) => {
    if (!publicKey) return addLog("❌ Connect wallet first!");
    setLoading(true);
    try {
      const buyerAta = await getAssociatedTokenAddress(escrow.mint, publicKey), vault = await getAssociatedTokenAddress(escrow.mint, escrow.pubkey, true);
      const data = Buffer.from(WL_LOCK_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:escrow.mint, isSigner:false, isWritable:false },{ pubkey:escrow.pubkey, isSigner:false, isWritable:true },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:buyerAta, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: WL_PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      addLog("✅ Payment locked! "+sig); fetchWlEscrows();
    } catch (err) { addLog("❌ "+err.message); }
    setLoading(false);
  };

  const confirmWl = async (escrow) => {
    if (!publicKey) return addLog("❌ Connect wallet first!");
    setLoading(true);
    try {
      const seller = escrow.role==="seller"?escrow.maker:escrow.taker;
      const sellerAta = await getAssociatedTokenAddress(escrow.mint, seller), vault = await getAssociatedTokenAddress(escrow.mint, escrow.pubkey, true);
      const data = Buffer.from(WL_CONFIRM_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:seller, isSigner:false, isWritable:true },{ pubkey:escrow.mint, isSigner:false, isWritable:false },{ pubkey:escrow.pubkey, isSigner:false, isWritable:true },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:sellerAta, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:ASSOCIATED_TOKEN_PROGRAM_ID, isSigner:false, isWritable:false },{ pubkey:SystemProgram.programId, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: WL_PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      addLog("✅ WL confirmed! Payment released. "+sig); fetchWlEscrows();
    } catch (err) { addLog("❌ "+err.message); }
    setLoading(false);
  };

  const disputeWl = async (escrow) => {
    if (!publicKey) return addLog("❌ Connect wallet first!");
    setLoading(true);
    try {
      const buyerAta = await getAssociatedTokenAddress(escrow.mint, publicKey), vault = await getAssociatedTokenAddress(escrow.mint, escrow.pubkey, true);
      const data = Buffer.from(WL_DISPUTE_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:escrow.mint, isSigner:false, isWritable:false },{ pubkey:escrow.pubkey, isSigner:false, isWritable:true },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:buyerAta, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: WL_PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      addLog("✅ Disputed! Funds returned. "+sig); fetchWlEscrows();
    } catch (err) { addLog("❌ "+err.message); }
    setLoading(false);
  };

  const cancelWlListing = async (escrow) => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const vault = await getAssociatedTokenAddress(escrow.mint, escrow.pubkey, true);
      const data = Buffer.from(WL_CANCEL_DISCRIMINATOR);
      const keys = [{ pubkey:publicKey, isSigner:true, isWritable:true },{ pubkey:escrow.pubkey, isSigner:false, isWritable:true },{ pubkey:vault, isSigner:false, isWritable:true },{ pubkey:TOKEN_PROGRAM_ID, isSigner:false, isWritable:false }];
      const tx = new Transaction().add(new TransactionInstruction({ keys, programId: WL_PROGRAM_ID, data }));
      const sig = await signAndSend(tx);
      localStorage.removeItem("wl_meta_"+escrow.pubkey.toBase58());
      addLog("✅ Listing cancelled! "+sig); fetchWlEscrows();
    } catch (err) { addLog("❌ "+err.message); }
    setLoading(false);
  };

  const tabs = [
    { key: "create", label: "Create" },
    { key: "explore", label: "Explore" },
    { key: "my", label: "My" },
    { key: "services", label: "WL" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:0.4;transform:scale(0.8) } 50% { opacity:1;transform:scale(1.2) } }
        @keyframes slideUp { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }
        @keyframes slideIn { from { opacity:0;transform:translateX(100px) } to { opacity:1;transform:translateX(0) } }
        @keyframes fadeOut { from { opacity:1;transform:translateX(0) } to { opacity:0;transform:translateX(100px) } }
        .glass-card { background:rgba(255,255,255,0.02);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);border-radius:24px;transition:all 0.3s; }
        .glass-card:hover { background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);transform:translateY(-2px); }
        input:focus, select:focus { border-color: rgba(255,255,255,0.25) !important; box-shadow: 0 0 0 4px rgba(255,255,255,0.03), inset 0 1px 2px rgba(0,0,0,0.1) !important; background: rgba(20,24,32,0.9) !important; }
        select option { background: #111; color: #fff; }
        .animate-slide-up { animation:slideUp 0.4s ease forwards; }
        .live-dot { width:7px;height:7px;background:#22c55e;border-radius:50%;display:inline-block;animation:pulse 2s infinite; }
        .link-hover:hover { color:#fff !important; text-decoration:underline; }
        .hide-mobile { display: flex; }
        .hide-desktop { display: none; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .hide-desktop { display: flex !important; }
          .nav-links { display: none !important; }
          .hero-title { font-size: 32px !important; }
          .hero-subtitle { font-size: 15px !important; }
          .content-pad { padding: 24px 16px 40px !important; }
          .card-pad { padding: 20px 16px !important; }
          .tab-btn { padding: 12px 18px !important; font-size: 13px !important; }
          .toast-container { left: 16px; right: 16px; max-width: none !important; }
          .explore-card { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
          .explore-card button { width: 100% !important; }
        }
        @media (max-width: 480px) {
          .hero-title { font-size: 26px !important; }
          .form-row { flex-direction: column !important; }
          .form-row select { flex: 1 !important; width: 100% !important; }
        }
      `}</style>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, zIndex: 50, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: -1, background: "linear-gradient(135deg, #fff 0%, #a1a1aa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Eswift</span>
          <span style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", color: "#a1a1aa", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>ESCROW</span>
        </div>
        <div className="nav-links" style={{ display: "flex", gap: 20, fontWeight: 500, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          <span style={{ color: "#fff" }}>Escrow</span><span>Explore</span><span>Marketplace</span><span>About</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="hide-desktop" onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: "4px 8px" }}>
            {mobileMenu ? "✕" : "☰"}
          </button>
          <WalletMultiButton style={{ background: "linear-gradient(135deg, #fff 0%, #e5e5e5 100%)", color: "#000", borderRadius: 999, padding: "8px 16px", fontWeight: 600, fontSize: 13, border: "none" }} />
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="hide-desktop" style={{ background: "rgba(0,0,0,0.95)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setMobileMenu(false); }} style={{ background: tab===t.key?"rgba(255,255,255,0.08)":"none", border:"none", color:"#fff", padding:"10px 16px", borderRadius:10, textAlign:"left", fontSize:14, fontWeight:500, cursor:"pointer" }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Hero */}
      {connected && (
        <div style={{ padding: "30px 16px 20px", textAlign: "center", background: "radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,255,255,0.06) 0%,transparent 70%)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", borderRadius: 999, padding: "5px 14px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
            <span className="live-dot"></span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>Live on Solana Devnet</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, margin: "0 0 8px" }}>Secure <span style={{ background: "linear-gradient(135deg, #fff 0%, #71717a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Escrow</span> for Modern Transactions</h1>
          <p className="hero-subtitle" style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, marginBottom: 20 }}>Lock tokens in smart contracts. Zero trust required.</p>
          <div className="hide-mobile" style={{ maxWidth: 460, margin: "0 auto" }}>
            <div style={{ ...styles.glass, padding: 16, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Live Activity</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>REAL-TIME</span>
              </div>
              {feed.slice(0, 3).map((f, i) => (
                <div key={i} className="animate-slide-up" style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 10, borderLeft: "2px solid rgba(255,255,255,0.2)", marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>⚡</div>
                  <div style={{ flex: 1, fontSize: 12 }}>{f.text}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{f.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs - desktop */}
      <div className="hide-mobile" style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", marginTop: connected ? 0 : 40 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="tab-btn" style={{ padding: "14px 32px", fontSize: 14, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: tab===t.key?"#fff":"rgba(255,255,255,0.35)", borderBottom: tab===t.key?"2px solid #fff":"2px solid transparent", transition: "all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="content-pad" style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px 60px" }}>
        {!connected && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, background: "linear-gradient(135deg, #fff 0%, #71717a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Eswift</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Connect your wallet to get started</p>
          </div>
        )}

        {/* ====== CREATE TAB ====== */}
        {connected && tab === "create" && (
          <div className="glass-card animate-slide-up card-pad" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Create Token Escrow</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Token You Lock (Mint Address)</label>
              <input placeholder="Paste token mint address..." value={lockToken} onChange={(e) => setLockToken(e.target.value)} style={styles.input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Amount to Lock</label>
              <input placeholder="Amount" value={lockAmount} onChange={(e) => setLockAmount(e.target.value)} style={styles.input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Token You Want (Mint Address)</label>
              <input placeholder="Paste token mint address..." value={wantToken} onChange={(e) => setWantToken(e.target.value)} style={styles.input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Amount You Want</label>
              <input placeholder="Amount" value={wantAmount} onChange={(e) => setWantAmount(e.target.value)} style={styles.input} />
            </div>
            {lockAmount && wantAmount && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "rgba(255,255,255,0.5)", display: "flex", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span>Rate</span><span style={{ color: "#fff", fontWeight: 600 }}>1 : {(Number(wantAmount)/Number(lockAmount)).toFixed(4)}</span>
              </div>
            )}
            <button onClick={createEscrow} disabled={loading||!lockToken||!wantToken||!lockAmount||!wantAmount} style={{ ...styles.btnPrimary, width: "100%", padding: "15px", fontSize: 15, opacity: (loading||!lockToken||!wantToken||!lockAmount||!wantAmount)?0.4:1 }}>Create Escrow</button>
            {escrowPda && <button onClick={cancelEscrow} disabled={loading} style={{ ...styles.btnDanger, width: "100%", padding: "13px", fontSize: 14, marginTop: 8 }}>Cancel Escrow</button>}
          </div>
        )}

        {/* ====== EXPLORE TAB ====== */}
        {connected && tab === "explore" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Explore</h2>
              <button onClick={fetchEscrows} style={{ background: "rgba(255,255,255,0.04)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>🔄 Refresh</button>
            </div>
            {allEscrows.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>No open escrows.</p>}
            {allEscrows.map((esc, i) => (
              <div key={i} className="glass-card animate-slide-up explore-card" style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4, fontFamily: "monospace" }}>{esc.pubkey.toBase58().slice(0,10)}...</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Locked: {esc.amountA.div(new BN(1_000_000)).toString()} Token A</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Wants: {esc.amountB.div(new BN(1_000_000)).toString()} Token B</div>
                </div>
                <button onClick={() => takeEscrow(esc)} disabled={loading||esc.maker.equals(publicKey)} style={{ ...styles.btnPrimary, padding: "10px 20px", fontSize: 13, borderRadius: 10, opacity: (loading||esc.maker.equals(publicKey))?0.3:1, whiteSpace:"nowrap" }}>
                  {esc.maker.equals(publicKey)?"Yours":"Take"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ====== MY ESCROWS TAB ====== */}
        {connected && tab === "my" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>My Escrows</h2>
            {allEscrows.filter(e => e.maker.equals(publicKey)).length===0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>No open escrows.</p>}
            {allEscrows.filter(e => e.maker.equals(publicKey)).map((esc, i) => (
              <div key={i} className="glass-card animate-slide-up" style={{ padding: 18, marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Locked: {esc.amountA.div(new BN(1_000_000)).toString()} Token A</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Wants: {esc.amountB.div(new BN(1_000_000)).toString()} Token B</div>
                <button onClick={() => { setEscrowPda(esc.pubkey); setLockToken(esc.mintA.toBase58()); cancelEscrow(); }} disabled={loading} style={{ ...styles.btnDanger, padding: "8px 18px", fontSize: 13, borderRadius: 10 }}>Cancel</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== SERVICES TAB ====== */}
        {connected && tab === "services" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Whitelist Services</h2>
            <div className="glass-card animate-slide-up card-pad" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create Listing</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>I am</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setWlRole("seller")} style={styles.pill(wlRole==="seller")}>Selling WL Spot</button>
                  <button onClick={() => setWlRole("buyer")} style={styles.pill(wlRole==="buyer")}>Looking for WL</button>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Project Name</label>
                <input placeholder="e.g. Mad Lads" value={wlProjectName} onChange={(e) => setWlProjectName(e.target.value)} style={styles.input} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Allocation Type</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setWlAllocationType("GTD")} style={styles.pill(wlAllocationType==="GTD")}>GTD</button>
                  <button onClick={() => setWlAllocationType("FCFS")} style={styles.pill(wlAllocationType==="FCFS")}>FCFS</button>
                </div>
              </div>
              <div className="form-row" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Quantity</label>
                  <input placeholder="1" value={wlQuantity} onChange={(e) => setWlQuantity(e.target.value)} style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Listing ID</label>
                  <input placeholder="1" value={wlId} onChange={(e) => setWlId(e.target.value)} style={styles.input} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Price Type</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setWlPriceType("per-spot")} style={styles.pill(wlPriceType==="per-spot")}>Per Spot</button>
                  <button onClick={() => setWlPriceType("total")} style={styles.pill(wlPriceType==="total")}>Total</button>
                </div>
              </div>
              <div className="form-row" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Price ({wlPriceType==="per-spot"?"per":"total"})</label>
                  <input placeholder="5" value={wlAmount} onChange={(e) => setWlAmount(e.target.value)} style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Token</label>
                  <select value={wlPaymentToken} onChange={(e) => { setWlPaymentToken(e.target.value); if(e.target.value!=="SPL") setWlCustomMint(""); }} style={styles.select}>
                    <option value="SOL">SOL</option><option value="USDC">USDC</option><option value="SPL">SPL</option>
                  </select>
                </div>
              </div>
              {wlPaymentToken==="SPL" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>SPL Mint Address</label>
                  <input placeholder="Paste SPL mint..." value={wlCustomMint} onChange={(e) => setWlCustomMint(e.target.value)} style={styles.input} />
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Project Link</label>
                <input placeholder="https://x.com/..." value={wlProjectLink} onChange={(e) => setWlProjectLink(e.target.value)} style={styles.input} />
              </div>
              {wlAmount && (
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, fontSize: 13, color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Price</span><span style={{ color: "#fff", fontWeight: 600 }}>{wlAmount} {wlPaymentToken} {wlPriceType==="per-spot"&&`× ${wlQuantity} spots`}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><span style={{ color: "#fff", fontWeight: 600 }}>{wlPriceType==="per-spot"?(Number(wlAmount)*Number(wlQuantity)).toFixed(2):Number(wlAmount).toFixed(2)} {wlPaymentToken}</span></div>
                </div>
              )}
              <button onClick={createWlListing} disabled={loading||!wlAmount||!wlId} style={{ ...styles.btnPrimary, width: "100%", padding: "13px", fontSize: 14, opacity: (loading||!wlAmount||!wlId)?0.4:1 }}>Create WL Listing</button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Browse Listings</h3>
              <button onClick={fetchWlEscrows} style={{ background: "rgba(255,255,255,0.04)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>🔄 Refresh</button>
            </div>
            {allWlEscrows.length===0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 30 }}>No listings.</p>}
            {allWlEscrows.map((esc, i) => {
              const isMaker = esc.maker.equals(publicKey);
              const iAmBuyer = (esc.role==="seller"?!esc.maker.equals(publicKey):esc.maker.equals(publicKey));
              const meta = JSON.parse(localStorage.getItem("wl_meta_"+esc.pubkey.toBase58())||"{}");
              return (
                <div key={i} className="glass-card animate-slide-up" style={{ padding: 18, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={styles.badge(esc.role==="seller"?"34,197,94":"59,130,246")}>{esc.role==="seller"?"Sell":"Buy"} WL</span>
                      <span style={styles.badge(esc.status==="open"?"250,204,21":"168,85,247")}>{esc.status==="open"?"Open":"Locked"}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>#{esc.id?.toString()||"?"}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{esc.amount.div(new BN(1_000_000)).toString()} {getPaymentLabel(esc.mint)}</div>
                  </div>
                  {meta.projectName && (
                    <div style={{ marginBottom: 6, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.projectName}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{meta.allocationType} · {meta.quantity||1} spot(s) · {meta.priceType==="per-spot"?"Per spot":"Total"}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {esc.status==="open"&&((esc.role==="buyer"&&isMaker)||(esc.role==="seller"&&!isMaker))&&<button onClick={()=>lockWlPayment(esc)} disabled={loading} style={{...styles.btnPrimary,padding:"8px 14px",fontSize:12,borderRadius:8}}>Lock Payment</button>}
                    {isMaker&&esc.status==="open"&&<button onClick={()=>cancelWlListing(esc)} disabled={loading} style={{...styles.btnDanger,padding:"8px 14px",fontSize:12,borderRadius:8}}>Cancel</button>}
                    {esc.status==="locked"&&iAmBuyer&&<><button onClick={()=>confirmWl(esc)} disabled={loading} style={{...styles.btnSuccess,padding:"8px 14px",fontSize:12,borderRadius:8}}>Confirm</button><button onClick={()=>disputeWl(esc)} disabled={loading} style={{...styles.btnDanger,padding:"8px 14px",fontSize:12,borderRadius:8}}>Dispute</button></>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
        © 2026 Eswift — Trustless Escrow for the new era of trade
      </div>
    </div>
  );
}

export default App;