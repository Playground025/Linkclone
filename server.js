const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const path = require('path');

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required!' });

    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
        videoId = match[2];
    } else {
        return res.status(400).json({ error: 'Invalid YouTube URL!' });
    }

    try {
        const resApi = await fetch(`https://invidious.io.lol/api/v1/videos/${videoId}`);
        if (!resApi.ok) throw new Error();
        const data = await resApi.json();

        return res.json({ 
            type: 'single', 
            tracks: [{ url: url, videoId: videoId, title: data.title }] 
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to analyze the link. Please try another video.' });
    }
});

app.get('/download-mp3', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('Invalid Video ID');

    try {
        const resApi = await fetch(`https://invidious.io.lol/api/v1/videos/${videoId}`);
        if (!resApi.ok) throw new Error();
        const data = await resApi.json();
        const title = data.title.replace(/[\\/:*?"<>|]/g, "");

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const audioUrl = `https://invidious.io.lol/latest_version?id=${videoId}&itag=140`;

        ffmpeg(audioUrl)
            .audioBitrate(320)
            .toFormat('mp3')
            .on('error', (err) => console.log('FFmpeg Error:', err.message))
            .pipe(res);
    } catch (err) {
        res.status(500).send('Error processing MP3 audio.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
