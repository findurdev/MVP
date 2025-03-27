const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '75edbb80-aca9-4f57-ad88-f846627b2a6b';

app.use(cors());
app.use(express.json());

/**
 * 📅 Fonction robuste pour formater une date
 */
const formatDate = (timestamp) => {
    if (!timestamp) return "Non disponible"; // Gère `null` et `undefined`

    const numTimestamp = Number(timestamp);
    if (isNaN(numTimestamp)) return "Format invalide"; // Vérifie que c’est un nombre

    // Ajuste le timestamp (en secondes ou millisecondes)
    const adjustedTimestamp = numTimestamp < 10000000000 ? numTimestamp * 1000 : numTimestamp;

    const date = new Date(adjustedTimestamp);
    return isNaN(date.getTime()) ? "Format invalide" : date.toISOString();
};

/**
 * 🔍 Récupérer les informations complètes du token Solana
 */
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
        const tokenData = response.data.result;

        if (!tokenData) {
            return res.status(404).json({ error: "Token non trouvé" });
        }

        res.json({
            contract: contractAddress,
            name: tokenData.name || "Inconnu",
            symbol: tokenData.symbol || "N/A",
            supply: tokenData.supply || 0,
            decimals: tokenData.decimals || 0,
            mintEnabled: Boolean(tokenData.mint?.authority),
            freezeEnabled: Boolean(tokenData.freezeAuthority),
            createdAt: formatDate(tokenData.createdAt) // Utilisation de la fonction sécurisée
        });
    } catch (error) {
        console.error('Erreur API Helius:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des données du token' });
    }
});

/**
 * 🔍 Récupérer le nombre de holders d’un token Solana
 */
app.get('/get-token-holders/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const requestBody = {
        jsonrpc: "2.0",
        id: "holders-info",
        method: "getTokenAccountsByOwner",
        params: {
            owner: contractAddress,
            programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
    };

    try {
        const response = await axios.post(url, requestBody);
        const holders = response.data.result?.value?.length || 0;

        res.json({
            contract: contractAddress,
            holdersCount: holders
        });
    } catch (error) {
        console.error('Erreur API Helius:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération du nombre de holders' });
    }
});

/**
 * 🔍 Scan de sécurité avancé du contrat
 */
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

/**
 * 🔎 Fonction d’analyse des vulnérabilités du smart contract
 */
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

/**
 * 🔢 Fonction de calcul du score de sécurité
 */
function calculateScore(findings) {
    let score = 100;
    findings.forEach(f => {
        if (f.severity === "High") score -= 20;
        if (f.severity === "Medium") score -= 10;
    });
    return Math.max(score, 0);
}

/**
 * 🚀 Lancer le serveur
 */
app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
