const anchor = require("@coral-xyz/anchor");
const { createMint, createAssociatedTokenAccount, mintTo, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");

async function main() {
  const connection = new anchor.web3.Connection("http://localhost:8899", "confirmed");
  const wallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(require("fs").readFileSync(require("os").homedir() + "/.config/solana/id.json", "utf8")))
  );

  // Create Mint A and Mint B
  const mintA = await createMint(connection, wallet, wallet.publicKey, null, 6);
  const mintB = await createMint(connection, wallet, wallet.publicKey, null, 6);

  // Create your ATAs
  const yourAtaA = await createAssociatedTokenAccount(connection, wallet, mintA, wallet.publicKey);
  const yourAtaB = await createAssociatedTokenAccount(connection, wallet, mintB, wallet.publicKey);

  // Mint tokens to yourself
  await mintTo(connection, wallet, mintA, yourAtaA, wallet.publicKey, 1000000000);
  await mintTo(connection, wallet, mintB, yourAtaB, wallet.publicKey, 1000000000);

  console.log("Mint A:", mintA.toBase58());
  console.log("Mint B:", mintB.toBase58());
  console.log("Your ATA A:", yourAtaA.toBase58());
  console.log("Your ATA B:", yourAtaB.toBase58());
  console.log("Wallet:", wallet.publicKey.toBase58());
}

main().catch(console.error);
