'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const EventStrategies = require('fabric-network/lib/impl/event/defaulteventhandlerstrategies');
const { SingleQueryHandler } = require('fabric-network/lib/impl/query/singlequeryhandler');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ── CONFIG ───────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_QUERY_USER = 'user1';
const DEFAULT_UPDATE_USER = 'manager';
const IPFS_API = process.env.IPFS_API || 'http://127.0.0.1:5001/api/v0';
const WALLET_PATH = path.join(__dirname, 'wallet');

const FABRIC_CHANNEL_NAME = process.env.FABRIC_CHANNEL_NAME || 'mychannel';
const FABRIC_CHAINCODE_NAME = process.env.FABRIC_CHAINCODE_NAME || 'ehr';

const PC1_IP = "100.124.176.94"; // Manager PC (This machine)

const ccpPath = path.resolve(__dirname, 'connection.json');
let ccp = {};
try {
    ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
} catch (e) {
    console.error("Connection profile NOT FOUND at", ccpPath);
}

// ── IDENTITY MAPPING ──────────────────────────────────────────────────────────

/**
 * Deterministically maps any physical ID (e.g. pat001) to one of the 50 
 * unique X.509 certificates in the wallet.
 */
function mintUserCertificate(id) {
    if (!id) return DEFAULT_QUERY_USER;
    
    // Internal technical IDs use fixed certs
    if (id === 'admin') return 'admin';
    if (id === 'manager') return 'manager';
    
    // Hash the ID to pick a cert index (1-50)
    const hash = crypto.createHash('sha256').update(id).digest('hex');
    const index = (parseInt(hash.slice(0, 8), 16) % 50) + 1;
    return `user${index}`;
}

// ── GATEWAY HELPERS ───────────────────────────────────────────────────────────

async function getGateway(userId) {
    const certIdentity = mintUserCertificate(userId);
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    
    const identity = await wallet.get(certIdentity);
    if (!identity) {
        console.warn(`[Identity] ${certIdentity} not in wallet. Falling back to user1.`);
        const fallback = await wallet.get('user1');
        if (!fallback) throw new Error("Wallet is EMPTY. Run import_wallet.sh first.");
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: identity ? certIdentity : 'user1',
        discovery: { enabled: true, asLocalhost: false },
        eventHandlerOptions: { strategy: EventStrategies.MSPID_SCOPE_ALLFORTX },
        queryHandlerOptions: {
            strategy: (network) => new SingleQueryHandler(network.getChannel().client.getEndorsers())
        }
    });
    return gateway;
}

/**
 * Routing logic based on Chaincode functions 
 * (Distributes load across PC1, PC2, PC3 in the Swarm)
 */
function autoRoute(fnName) {
    const lower = fnName.toLowerCase();
    if (lower.includes('billing') || lower.includes('payment')) return 'billing';
    if (lower.includes('inventory') || lower.includes('stock')) return 'inventory';
    if (lower.includes('management') || lower.includes('register')) return 'manager';
    return 'default';
}

function getContractAndPeer(network, moduleHint = 'default') {
    const contract = network.getContract(FABRIC_CHAINCODE_NAME);
    const endorsers = network.getChannel().client.getEndorsers();
    
    // LOAD BALANCING LOGIC
    // PC1 = manager, PC2 = billing, PC3 = inventory
    let peer;
    if (moduleHint === 'billing') {
        peer = endorsers.find(p => p.getUrl().includes(':7051') && !p.getUrl().includes(PC1_IP)) || endorsers[0];
    } else if (moduleHint === 'inventory') {
        peer = endorsers.find(p => p.getUrl().includes(':7051')) || endorsers[0];
    } else {
        peer = endorsers[0];
    }
    
    return { contract, peer };
}

// ── IPFS HELPERS ──────────────────────────────────────────────────────────────
async function ipfsAdd(jsonData) {
    const form = new FormData();
    form.append('file', Buffer.from(JSON.stringify(jsonData)));
    const response = await axios.post(`${IPFS_API}/add`, form, { headers: form.getHeaders() });
    return response.data.Hash;
}

async function ipfsCat(hash) {
    const response = await axios.post(`${IPFS_API}/cat?arg=${hash}`);
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
}

// ── CHAINCODE AGNOSTIC HELPERS ───────────────────────────────────────────────

async function invokeChaincode(user, fnName, ...args) {
    const channelName = (String(args[0]).endsWith('-channel')) ? args.shift() : FABRIC_CHANNEL_NAME;
    const gateway = await getGateway(user);
    const network = await gateway.getNetwork(channelName);
    const { contract, peer } = getContractAndPeer(network, autoRoute(fnName));
    const tx = contract.createTransaction(fnName).setEndorsingPeers([peer]);
    const result = await tx.submit(...args);
    await gateway.disconnect();
    return JSON.parse(result.toString());
}

async function queryChaincode(user, fnName, ...args) {
    const channelName = (String(args[0]).endsWith('-channel')) ? args.shift() : FABRIC_CHANNEL_NAME;
    const gateway = await getGateway(user);
    const network = await gateway.getNetwork(channelName);
    const { contract, peer } = getContractAndPeer(network, autoRoute(fnName));
    const result = await contract.evaluateTransaction(fnName, ...args);
    await gateway.disconnect();
    return JSON.parse(result.toString());
}

// ── API ROUTES ───────────────────────────────────────────────────────────────

// Middleware
const requireBody = (...fields) => (req, res, next) => {
    for (const f of fields) if (!req.body[f]) return res.status(400).json({ error: `Missing ${f}` });
    next();
};

app.get('/health', (req, res) => res.json({ status: 'UP', swarm: true, pc: PC1_IP }));

/**
 * POST /api/register-user
 * Role-based employee registration
 */
app.post('/api/register-user', requireBody('userId', 'role'), async (req, res) => {
    try {
        const { user = 'manager', userId, role } = req.body;
        const result = await invokeChaincode(user, 'registerUser', userId, role);
        res.status(200).json({ success: true, user: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/prescription
 */
app.post('/api/prescription', requireBody('patientId', 'name', 'medicines'), async (req, res) => {
    try {
        const { user = DEFAULT_QUERY_USER, patientId, name, medicines, extraData = {} } = req.body;
        const doc = { patientId, name, medicines, createdAt: new Date().toISOString(), ...extraData };
        const ipfsHash = await ipfsAdd(doc);

        const result = await invokeChaincode(user, 'createPrescription', patientId, name, JSON.stringify(medicines), ipfsHash);
        
        // Option 2: Double Submission Sync to Global Hospital Channel (STUB)
        // await invokeChaincode(user, 'createPrescription', 'hospital-channel', patientId, name, JSON.stringify(medicines), ipfsHash);

        res.status(200).json({ success: true, ipfsHash, prescription: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/grant-access
 */
app.post('/api/grant-access', requireBody('patientId', 'requesterId'), async (req, res) => {
    try {
        const { user = DEFAULT_UPDATE_USER, patientId, requesterId } = req.body;
        const result = await invokeChaincode(user, 'grantAccess', patientId, requesterId);
        // Sync to hospital-channel
        // await invokeChaincode(user, 'grantAccess', 'hospital-channel', patientId, requesterId);
        res.status(200).json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/revoke-access
 */
app.post('/api/revoke-access', requireBody('patientId', 'requesterId'), async (req, res) => {
    try {
        const { user = DEFAULT_QUERY_USER, patientId, requesterId } = req.body;
        const result = await invokeChaincode(user, 'revokeAccess', patientId, requesterId);
        // Sync to hospital-channel
        // await invokeChaincode(user, 'revokeAccess', 'hospital-channel', patientId, requesterId);
        res.status(200).json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/patients/:id
 */
app.get('/api/patients/:id', async (req, res) => {
    try {
        const user = req.query.user || DEFAULT_QUERY_USER;
        const result = await queryChaincode(user, 'getPatientRecords', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /all
 */
app.get('/all', async (req, res) => {
    try {
        const user = req.query.user || DEFAULT_QUERY_USER;
        const result = await queryChaincode(user, 'getAllRecords');
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/users
 */
app.get('/api/users', async (req, res) => {
    try {
        const user = req.query.user || DEFAULT_QUERY_USER;
        const result = await queryChaincode(user, 'getAllUsers');
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/network-status
 * Multi-node block height telemetry
 */
app.get('/api/network-status', async (req, res) => {
    try {
        const results = {};
        const queryHeight = async (name, ip, user, cmd) => {
            try {
                let output;
                if (ip === '127.0.0.1' || ip === PC1_IP) {
                    const { execSync } = require('child_process');
                    output = execSync(cmd).toString();
                } else {
                    const { execSync } = require('child_process');
                    output = execSync(`ssh -o BatchMode=yes ${user}@${ip} "${cmd}"`).toString();
                }
                const match = output.match(/height: (\d+)/);
                return match ? parseInt(match[1]) : 'Unknown';
            } catch (e) {
                return 'OFFLINE';
            }
        };

        const peerCmd = (id) => `docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/admin_msp ${id} peer channel getinfo -c ${FABRIC_CHANNEL_NAME}`;
        
        const p0_id = require('child_process').execSync('docker ps -q -f name=ehrswarm-peer0_peer0').toString().trim();
        results.peer0 = await queryHeight('Peer0', PC1_IP, '', peerCmd(p0_id));
        results.peer1 = await queryHeight('Peer1', '100.83.121.98', 'rajput_mt', "docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/admin_msp \\$(docker ps -q -f name=ehrswarm-peer1_peer1) peer channel getinfo -c " + FABRIC_CHANNEL_NAME);
        results.peer2 = await queryHeight('Peer2', '100.117.138.55', 'ronit', "docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/admin_msp \\$(docker ps -q -f name=ehrswarm-peer2_peer2) peer channel getinfo -c " + FABRIC_CHANNEL_NAME);

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
    console.log(`Pharmacy MedBlock v2.0 running on http://${HOST}:${PORT}`);
    console.log(`Wallet Path: ${WALLET_PATH}`);
    console.log(`Channel: ${FABRIC_CHANNEL_NAME} | Chaincode: ${FABRIC_CHAINCODE_NAME}`);
});
