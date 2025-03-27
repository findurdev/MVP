const app = express();
const PORT = 3000;

const HELIUS_API_KEY = '75edbb80-aca9-4f57-ad88-f846627b2a6b'; // Remplace par ta clé API Helius

app.use(express.json()); // Permet de traiter les requêtes avec des corps JSON

// Route pour obtenir les informations du token
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
        console.log(`Envoi de la requête pour le contrat: ${contractAddress}`);
        
        // Envoi de la requête POST à l'API Helius avec un timeout de 10 secondes
        const response = await axios.post(url, requestBody, { timeout: 10000 });
        
        console.log('Réponse complète de Helius:', response.data); // Log de la réponse complète

        // Vérifier si l'API Helius a renvoyé une erreur
        if (response.data.error) {
            console.error('Erreur de l\'API Helius:', response.data.error);
            return res.status(500).json({ error: `Erreur Helius: ${response.data.error.message}` });
        }

        // Vérifier si des données de token ont été renvoyées
        const tokenData = response.data.result;
        if (!tokenData) {
            console.error("Aucune donnée trouvée pour ce contrat.");
            return res.status(404).json({ error: "Token non trouvé" });
        }

        // Log des données du token récupérées
        console.log('Données du token récupérées:', tokenData);

        // Structurer et renvoyer la réponse
        res.json({
            contract: contractAddress,
            name: tokenData.content.metadata.name || "Inconnu",
            symbol: tokenData.content.metadata.symbol || "N/A",
            supply: tokenData.token_info.supply || 0,
            decimals: tokenData.token_info.decimals || 0,
            mintEnabled: Boolean(tokenData.content.royalty) && tokenData.content.royalty.primary_sale_happened,
            freezeEnabled: Boolean(tokenData.content.royalty) && tokenData.content.royalty.locked,
            createdAt: tokenData.content.metadata.description || "Inconnu"
        });
    } catch (error) {
        // Log détaillé de l'erreur
        console.error('Erreur lors de l\'appel à l\'API Helius:', error.message);
        res.status(500).json({ error: `Erreur lors de la récupération des données du token: ${error.message}` });
    }
});

// Démarrer le serveur Express
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
