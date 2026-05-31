import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import App from "./App";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";

window.Buffer = Buffer;

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ConnectionProvider endpoint="http://localhost:8899">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);