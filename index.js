const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '75edbb80-aca9-4f57-ad88-f846627b2a6b';

app.use(cors());
app.use(express.json());

// 🚀 Route 1 : Récupérer les métadonnées du token
app.get('/get-token-info/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const requestBody = {
        jsonrpc: "2.0",
        id: "token-info",
        method: "getAsset",
        params: { id: contractAddress }
    };

    try {
        const response = await axios.post(url, requestBody);
        res.json(response.data);
    } catch (error) {
        console.error('Erreur API Helius:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des données du token' });
    }
});

// 🚀 Route 2 : Scan de sécurité du contrat
app.get('/deepScan/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const requestBody = {
        jsonrpc: "2.0",
        id: "deep-scan",
        method: "getProgramAccounts",
        params: { pubkey: contractAddress, encoding: "base64" }
    };

    try {
        const response = await axios.post(url, requestBody);
        const findings = analyzeContract(response.data);
        const securityScore = calculateScore(findings);

        res.json({
            contract: contractAddress,
            findings,
            securityScore,
            scannedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur API Helius:', error.message);
        res.status(500).json({ error: 'Erreur lors du scan du contrat' });
    }
});

// 🔎 Fonction d'analyse de vulnérabilités du smart contract
function analyzeContract(data) {
    let findings = [];

    if (JSON.stringify(data).includes("Upgradeable")) 
        findings.push({ issue: "Le contrat est upgradable", severity: "High" });

    if (JSON.stringify(data).includes("Admin")) 
        findings.push({ issue: "Présence d’un admin avec contrôle total", severity: "Medium" });

    if (JSON.stringify(data).includes("Freeze")) 
        findings.push({ issue: "Le contrat peut geler les fonds", severity: "High" });

    if (JSON.stringify(data).includes("Mint")) 
        findings.push({ issue: "Possibilité de mint de nouveaux tokens", severity: "Medium" });

    return findings;
}

// 🔢 Fonction de calcul du score de sécurité
function calculateScore(findings) {
    let score = 100;
    findings.forEach(f => {
        if (f.severity === "High") score -= 20;
        if (f.severity === "Medium") score -= 10;
    });
    return Math.max(score, 0);
}

// 🚀 Lancement du serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});

// Lancer le serveur
app.listen(PORT, () => console.log(`✅ Serveur lancé sur http://localhost:${PORT}`));
