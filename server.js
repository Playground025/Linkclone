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
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                isAudioOnly: true,
                audioFormat: 'mp3',
                audioBitrate: '320'
            })
        });

        const data = await response.json();

        if (data.status === 'error') {
            return res.status(400).json({ error: 'Cobalt API Error: ' + data.text });
        }

        if (data.status === 'redirect' && data.url) {
            let title = 'YouTube Audio Track';
            return res.json({ 
                type: 'single', 
                tracks: [{ downloadUrl: data.url, title: title }] 
            });
        }

        return res.status(500).json({ error: 'Unexpected response from service.' });
    } catch (err) {
        return res.status(500).json({ error: 'Server connection error. Try again.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
