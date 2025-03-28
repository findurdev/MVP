const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HELIUS_API_KEY = '75edbb80-aca9-4f57-ad88-f846627b2a6b';

app.use(cors());
app.use(express.json());

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

    console.log(`[INFO] Envoi de la requête pour récupérer les informations du token pour le contrat : ${contractAddress}`);

    try {
        console.log(`[INFO] URL de l'API Helius : ${url}`);
        console.log(`[INFO] Corps de la requête : ${JSON.stringify(requestBody, null, 2)}`);

        const response = await axios.post(url, requestBody);
        console.log("[INFO] Réponse reçue de l'API Helius.");

        const tokenData = response.data.result;
        console.log("[INFO] Données du token reçues :", JSON.stringify(tokenData, null, 2));

        if (!tokenData) {
            console.error("[ERROR] Token non trouvé.");
            return res.status(404).json({ error: "Token non trouvé" });
        }

        // Assurer des valeurs par défaut
        const name = tokenData.name || "N/A";
        const symbol = tokenData.symbol || "N/A";
        const supply = tokenData.supply ?? 0;
        const decimals = tokenData.decimals ?? 0;

        const isMintEnabled = tokenData.mint?.authority !== null;
        const isFreezeEnabled = tokenData.freezeAuthority !== null;

        // Gestion de la date de création
        let createdAt = "Date inconnue";
        if (tokenData.createdAt && Number.isFinite(tokenData.createdAt)) {
            createdAt = new Date(tokenData.createdAt * 1000).toISOString();
        }

        console.log("[INFO] Données du token formatées :");
        console.log({ contract: contractAddress, name, symbol, supply, decimals, mintEnabled: isMintEnabled, freezeEnabled: isFreezeEnabled, createdAt });

        res.json({
            contract: contractAddress,
            name,
            symbol,
            supply,
            decimals,
            mintEnabled: isMintEnabled,
            freezeEnabled: isFreezeEnabled,
            createdAt
        });
    } catch (error) {
        console.error('[ERROR] Erreur API Helius:', error.response?.data || error.message);
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

    console.log(`[INFO] Envoi de la requête pour récupérer les holders du token pour le contrat : ${contractAddress}`);

    try {
        console.log(`[INFO] URL de l'API Helius : ${url}`);
        console.log(`[INFO] Corps de la requête : ${JSON.stringify(requestBody, null, 2)}`);

        const response = await axios.post(url, requestBody);
        console.log("[INFO] Réponse reçue de l'API Helius.");

        const holdersCount = response.data.result?.value?.length || 0;
        console.log(`[INFO] Nombre de holders pour le contrat ${contractAddress} : ${holdersCount}`);

        res.json({
            contract: contractAddress,
            holdersCount
        });
    } catch (error) {
        console.error('[ERROR] Erreur API Helius:', error.response?.data || error.message);
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

    console.log(`[INFO] Envoi de la requête pour effectuer un scan de sécurité pour le contrat : ${contractAddress}`);

    try {
        console.log(`[INFO] URL de l'API Helius : ${url}`);
        console.log(`[INFO] Corps de la requête : ${JSON.stringify(requestBody, null, 2)}`);

        const response = await axios.post(url, requestBody);
        console.log("[INFO] Réponse reçue de l'API Helius.");

        const findings = analyzeContract(response.data);
        console.log("[INFO] Résultats de l'analyse de sécurité :", JSON.stringify(findings, null, 2));

        const securityScore = calculateScore(findings);
        console.log("[INFO] Score de sécurité calculé :", securityScore);

        res.json({
            contract: contractAddress,
            findings,
            securityScore,
            scannedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[ERROR] Erreur API Helius:', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur lors du scan du contrat' });
    }
});

/**
 * 🔎 Fonction d’analyse des vulnérabilités du smart contract
 */
function analyzeContract(data) {
    console.log("[INFO] Début de l'analyse des vulnérabilités du smart contract.");

    let findings = [];

    if (JSON.stringify(data).includes("Upgradeable")) {
        findings.push({ issue: "Le contrat est upgradable", severity: "High" });
    }

    if (JSON.stringify(data).includes("Admin")) {
        findings.push({ issue: "Présence d’un admin avec contrôle total", severity: "Medium" });
    }

    if (JSON.stringify(data).includes("Freeze")) {
        findings.push({ issue: "Le contrat peut geler les fonds", severity: "High" });
    }

    if (JSON.stringify(data).includes("Mint")) {
        findings.push({ issue: "Possibilité de mint de nouveaux tokens", severity: "Medium" });
    }

    console.log("[INFO] Résultats de l'analyse de vulnérabilités :", JSON.stringify(findings, null, 2));
    return findings;
}

/**
 * 🔢 Fonction de calcul du score de sécurité
 */
function calculateScore(findings) {
    console.log("[INFO] Calcul du score de sécurité en fonction des vulnérabilités.");

    let score = 100;
    findings.forEach(f => {
        if (f.severity === "High") score -= 20;
        if (f.severity === "Medium") score -= 10;
    });

    score = Math.max(score, 0);
    console.log("[INFO] Score de sécurité final :", score);
    return score;
}

/**
 * 🚀 Lancer le serveur
 */
app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
