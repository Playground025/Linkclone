const express = require('express');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const path = require('path');

app.use(express.json());

// OVDE PROSLEDJUJEMO TVOJ COOKIE ZA AUTENTIFIKACIJU
const youtubeOptions = {
    requestOptions: {
        headers: {
            'Cookie': 'OVDE_NALEPI_CEO_TEKST_TVOG_KOLAČIĆA_SA_YOUTUBE_A'
        }
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL!' });
    }

    try {
        // Dodajemo opcije sa kolačićima u getBasicInfo
        const info = await ytdl.getBasicInfo(url, youtubeOptions);
        return res.json({ 
            type: 'single', 
            tracks: [{ url: url, title: info.videoDetails.title }] 
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to analyze the link. Please try again.' });
    }
});

app.get('/download-mp3', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl || !ytdl.validateURL(videoUrl)) return res.status(400).send('Invalid URL');

    try {
        // Dodajemo opcije i ovde za sam download
        const info = await ytdl.getInfo(videoUrl, youtubeOptions);
        const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, "");

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const audioStream = ytdl(videoUrl, { quality: 'highestaudio', ...youtubeOptions });

        ffmpeg(audioStream)
            .audioBitrate(320)
            .toFormat('mp3')
            .on('error', (err) => console.log('FFmpeg Error:', err.message))
            .pipe(res);
    } catch (err) {
        res.status(500).send('Error processing MP3 audio.');
    }
});

app.get('/download-mp4', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl || !ytdl.validateURL(videoUrl)) return res.status(400).send('Invalid URL');

    try {
        const info = await ytdl.getInfo(videoUrl, youtubeOptions);
        const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, "");

        res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        ytdl(videoUrl, { 
            format: 'mp4', 
            quality: 'highestvideo',
            ...youtubeOptions
        }).pipe(res);
    } catch (err) {
        res.status(500).send('Error processing MP4 video.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
