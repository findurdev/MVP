const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Clé API Helius
const HELIUS_API_KEY = '75edbb80-aca9-4f57-ad88-f846627b2a6b'; // Remplacer par ta clé API réelle

app.use(cors());
app.use(express.json());

/**
 * 🔍 Récupérer les informations complètes du token Solana
 */
app.get('/get-token-info/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    console.log(`Début de la requête pour le contrat : ${contractAddress}`);

    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const requestBody = {
        jsonrpc: "2.0",
        id: "token-info",
        method: "getAsset",
        params: { id: contractAddress }
    };

    try {
        console.log('Envoi de la requête à l\'API Helius...');
        const response = await axios.post(url, requestBody);
        
        // Log de la réponse brute de l'API
        console.log('Réponse brute de l\'API Helius:', JSON.stringify(response.data, null, 2));
        
        const tokenData = response.data.result;
        
        if (!tokenData) {
            console.log('Aucune donnée retournée pour le contrat');
            return res.status(404).json({ error: "Token non trouvé" });
        }

        // Log des données récupérées
        console.log('Données du token récupérées :', tokenData);

        // Vérification des permissions (mint, freeze)
        const isMintEnabled = tokenData.mint?.authority !== null;
        const isFreezeEnabled = tokenData.freezeAuthority !== null;

        // Log des paramètres de mint et freeze
        console.log(`Mint autorisé : ${isMintEnabled}, Freeze autorisé : ${isFreezeEnabled}`);

        // Date de création
        const creationDate = new Date(tokenData.createdAt * 1000).toISOString();
        console.log('Date de création du token :', creationDate);

        res.json({
            contract: contractAddress,
            name: tokenData.name || 'N/A',
            symbol: tokenData.symbol || 'N/A',
            supply: tokenData.supply || 0,
            decimals: tokenData.decimals || 0,
            mintEnabled: isMintEnabled,
            freezeEnabled: isFreezeEnabled,
            createdAt: creationDate || 'Date inconnue'
        });
    } catch (error) {
        console.error('Erreur lors de l\'appel à l\'API Helius:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des données du token' });
    }
});

/**
 * 🔍 Récupérer le nombre de holders d’un token Solana
 */
app.get('/get-token-holders/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    console.log(`Début de la requête pour le nombre de holders du contrat : ${contractAddress}`);

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
        console.log('Envoi de la requête à l\'API Helius pour récupérer les holders...');
        const response = await axios.post(url, requestBody);
        
        // Log de la réponse brute de l'API
        console.log('Réponse brute de l\'API Helius pour les holders :', JSON.stringify(response.data, null, 2));

        const holdersCount = response.data.result.value.length;
        
        // Log du nombre de holders
        console.log(`Nombre de holders : ${holdersCount}`);

        res.json({
            contract: contractAddress,
            holdersCount
        });
    } catch (error) {
        console.error('Erreur lors de l\'appel à l\'API Helius pour les holders:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération du nombre de holders' });
    }
});

/**
 * 🔍 Scan de sécurité avancé du contrat
 */
app.get('/deepScan/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    console.log(`Début du scan de sécurité pour le contrat : ${contractAddress}`);

    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const requestBody = {
        jsonrpc: "2.0",
        id: "deep-scan",
        method: "getProgramAccounts",
        params: { pubkey: contractAddress, encoding: "base64" }
    };

    try {
        console.log('Envoi de la requête à l\'API Helius pour le scan...');
        const response = await axios.post(url, requestBody);
        
        // Log de la réponse brute du scan
        console.log('Réponse brute du scan de l\'API Helius:', JSON.stringify(response.data, null, 2));

        const findings = analyzeContract(response.data);
        const securityScore = calculateScore(findings);

        // Log des résultats du scan
        console.log('Résultats du scan:', findings);
        console.log('Score de sécurité :', securityScore);

        res.json({
            contract: contractAddress,
            findings,
            securityScore,
            scannedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur lors du scan du contrat via l\'API Helius:', error.message);
        res.status(500).json({ error: 'Erreur lors du scan du contrat' });
    }
});

/**
 * 🔎 Fonction d’analyse des vulnérabilités du smart contract
 */
function analyzeContract(data) {
    let findings = [];

    // Log de l'input de données pour l'analyse
    console.log('Analyse du contrat, données reçues :', data);

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
