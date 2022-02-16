const Web3 = require('web3');
const { ethers } = require("ethers");
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer } = require('ethereumjs-util');
const { sendTx } = require('../gnosis');

async function deploy({
	web3,
	sender,
	threshold,
	owners,
	privateKey
}) {
	const chain = Chain.Rinkeby;
	const version = '1.3.0';
	const released = true;
	const filter = { version, released }
	const safeSingleton = getSafeSingletonDeployment(filter);
	const safeSingletonAddress = safeSingleton.networkAddresses[chain];
	const safeSingletonABI = safeSingleton.abi;

	const proxyFactory = getProxyFactoryDeployment(filter);
	const proxyFactoryABI = proxyFactory.abi;
	const proxyFactoryAddress = proxyFactory.networkAddresses[chain];

	const compatHandler = getCompatibilityFallbackHandlerDeployment(filter);
	const compatHandlerAddress = compatHandler.networkAddresses[chain];

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const params = [
		owners,
		threshold,
		ZERO_ADDRESS,
		'0x',
		compatHandlerAddress, // fallback handler
		ZERO_ADDRESS,
		0,
		ZERO_ADDRESS,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	const initializer = safeSingletonContract.methods.setup(...params).encodeABI();

	var saltNonce = 1644659321895 || Date.now();

	const proxyFactoryContract = new Contract(proxyFactoryABI, proxyFactoryAddress);
	proxyFactoryContract.setProvider(web3.currentProvider);

	const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, initializer, saltNonce).encodeABI();

	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
	const nonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce,
		data: input,
		to: proxyFactoryAddress,
		value: '0x00',
	});

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas,
			to: proxyFactoryAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(nonce)),
			gasLimit: toHex(toBN(gasLimit)),
		},
		opts
	);
	console.log('tx serialized	: ', tx.serialize().toString('hex'));
	console.log('tx hash 		: ', tx.getMessageToSign(true).toString('hex'));

	const signedTx = tx.sign(toBuffer(privateKey));

	console.log('signed tx		: ', signedTx.toJSON());

	const serialized = signedTx.serialize();
	const txid = signedTx.hash().toString('hex');
	console.log('txid 		: ', txid);

	var creationCode = await proxyFactoryContract.methods.proxyCreationCode().call();
	const deploymentCode = ethers.utils.solidityPack(["bytes", "uint256"], [creationCode, safeSingletonAddress])

	var salt = ethers.utils.solidityKeccak256(
		["bytes32", "uint256"],
		[ethers.utils.solidityKeccak256(["bytes"], [initializer]), saltNonce]
	)
	var address = ethers.utils.getCreate2Address(proxyFactoryAddress, salt, ethers.utils.keccak256(deploymentCode))
	console.log('address 				: ', address);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}


deploy({
	threshold,
	owners,
	web3,
	sender,
	privateKey
}).catch(console.error);
