const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required!' });

    try {
        // Koristimo alternativnu, stabilniju Cobalt instancu
        const response = await fetch('https://co.wuk.sh/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                videoQuality: '720',
                audioFormat: 'mp3',
                downloadMode: 'audio'
            })
        });

        const data = await response.json();

        if (data.status === 'error' || data.error) {
            // Precizno izvlačenje teksta greške iz objekta
            let errMsg = 'Unknown API Error';
            if (data.error && typeof data.error === 'object') {
                errMsg = data.error.code || data.error.text || JSON.stringify(data.error);
            } else if (typeof data.error === 'string') {
                errMsg = data.error;
            } else if (data.text) {
                errMsg = data.text;
            }
            return res.status(400).json({ error: 'Cobalt Error: ' + errMsg });
        }

        if (data.status === 'picker') {
            return res.status(400).json({ error: 'Playlists are not supported.' });
        }

        if ((data.status === 'redirect' || data.status === 'success') && data.url) {
            return res.json({ 
                type: 'single', 
                tracks: [{ downloadUrl: data.url, title: 'YouTube Audio Track' }] 
            });
        }

        return res.status(500).json({ error: 'Unexpected response format from API.' });
    } catch (err) {
        return res.status(500).json({ error: 'Server connection error. Try again.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
