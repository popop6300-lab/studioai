const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let pendingCommands = [];

app.get('/', function(req, res) {
  res.json({ status: 'StudioAI corriendo!' });
});

app.post('/chat', function(req, res) {
  const message = req.body.message;
  if (!message) {
    return res.status(400).json({ error: 'No message' });
  }
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key no configurada' });
  }
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'Eres un asistente de Roblox Studio. Cuando el usuario pida objetos, responde amigable y pon el codigo Lua entre <ROBLOX_CODE> y </ROBLOX_CODE>. Usa InsertService para assets. Assets: arbol=93792160, casa=1139788, roca=6359216, auto=695796.',
      messages: [{ role: 'user', content: message }]
    })
  }).then(function(response) {
    return response.json();
  }).then(function(data) {
    const text = data.content[0].text;
    const codeMatch = text.match(/<ROBLOX_CODE>([\s\S]*?)<\/ROBLOX_CODE>/);
    if (codeMatch) {
      pendingCommands.push({ id: Date.now(), code: codeMatch[1].trim(), description: message });
    }
    res.json({
      reply: text.replace(/<ROBLOX_CODE>[\s\S]*?<\/ROBLOX_CODE>/g, '').trim(),
      hasCode: !!codeMatch
    });
  }).catch(function(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  });
});

app.get('/poll', function(req, res) {
  if (pendingCommands.length > 0) {
    res.json({ hasCommand: true, command: pendingCommands.shift() });
  } else {
    res.json({ hasCommand: false });
  }
});

app.post('/confirm', function(req, res) {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Servidor corriendo en puerto ' + PORT);
});
