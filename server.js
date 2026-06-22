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
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        
        let title = 'YouTube Audio Track';
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace('- YouTube', '').trim();
        }

        return res.json({ 
            type: 'single', 
            tracks: [{ url: url, videoId: videoId, title: title }] 
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to parse video data. Try again.' });
    }
});

app.get('/download-mp3', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('Invalid Video ID');

    try {
        const titleResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await titleResponse.text();
        let title = 'audio';
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace('- YouTube', '').trim().replace(/[\\/:*?"<>|]/g, "");
        }

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const streamUrl = `https://rr1---sn-axq7sn7s.googlevideo.com/videoplayback?expire=1700000000&ei=123&ip=0.0.0.0&id=${videoId}&itag=140&source=youtube&requiressl=yes&vprv=1&ratebypass=yes&live=0`;
        const fallbackUrl = `https://www.youtube.com/watch?v=${videoId}`;

        ffmpeg(fallbackUrl)
            .inputOptions([
                '-agent_user_agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
                '-headers "Referer: https://www.youtube.com/"'
            ])
            .audioBitrate(320)
            .toFormat('mp3')
            .on('error', (err) => console.log('FFmpeg stream error:', err.message))
            .pipe(res);
    } catch (err) {
        res.status(500).send('Error processing MP3.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
