const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;
const HELIUS_API_KEY = 'c77e2de7-5ecc-4409-94c1-51964b1c1d47'; // Remplace par ta clé API Helius

app.use(cors()); // Autorise Lovable à accéder à ce serveur
app.use(express.json());

// Route pour récupérer les infos d’un token Solana
app.get('/get-token-info/:contractAddress', async (req, res) => {
    const { contractAddress } = req.params;
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const requestBody = {
        jsonrpc: "2.0",
        id: "my-request",
        method: "getAsset",
        params: {
            id: contractAddress
        }
    };

    try {
        const response = await axios.post(url, requestBody);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
});

// Lancer le serveur
app.listen(PORT, () => console.log(`✅ Serveur lancé sur http://localhost:${PORT}`));
