const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let pendingCommands = [];

app.get('/', (req, res) => {
  res.json({ status: 'StudioAI corriendo!' });
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Eres un asistente de Roblox Studio. Cuando el usuario pida objetos, responde amigable y pon el código Lua entre <ROBLOX_CODE> y </ROBLOX_CODE>. Usa InsertService para assets del Toolbox o crea objetos con Parts si no existen. Assets conocidos: árbol=93792160, casa=1139788, roca=6359216, auto=695796.`,
        messages: [{ role: 'user', content: message }]
      })
    });
    const data = await response.json();
    const text = data.content[0].text;
    const codeMatch = text.match(/<ROBLOX_CODE>([\s\S]*?)<\/ROBLOX_CODE>/);
    if (codeMatch) {
      pendingCommands.push({ id: Date.now(), code: codeMatch[1].trim(), description: message });
    }
    res.json({
      reply: text.replace(/<ROBLOX_CODE>[\s\S]*?<\/ROBLOX_CODE>/g, '').trim(),
      hasCode: !!codeMatch
    });
  } catch(e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/poll', (req, res) => {
  if (pendingCommands.length > 0) {
    res.json({ hasCommand: true, command: pendingCommands.shift() });
  } else {
    res.json({ hasCommand: false });
  }
});

app.post('/confirm', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor corriendo!'));
