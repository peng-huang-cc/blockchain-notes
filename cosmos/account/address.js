const { DirectSecp256k1HdWallet, decodePubkey } = require('@cosmjs/proto-signing');
const { toBase64, toHex } = require('@cosmjs/encoding');
const { pubkeyToRawAddress, pubkeyToAddress } = require('@cosmjs/amino');
const { stringToPath } = require('@cosmjs/crypto');

async function main() {
  const mnemonic = 'spice review cycle among deal estate main sport fold source face avocado';
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, stringToPath("m/0'/1/2'/2/1000000000"), 'blub');
  // const wallet = await DirectSecp256k1HdWallet.generate(12);
  console.log('wallet ', wallet.mnemonic);
  const [firstAccount] = await wallet.getAccounts();
  const pub = firstAccount.pubkey;
  console.log('pub', toBase64(pub));
  console.log('pub hex', toHex(pub));

  const address = pubkeyToAddress(pubkey, 'cosmos');
  console.log('address', address);
  console.log(firstAccount);
  console.log(firstAccount.address);
}

main().catch(console.error);
