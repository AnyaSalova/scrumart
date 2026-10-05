const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

const project = {
  name: 'ScrumArt',
  description: 'Веб-сервис управления проектами для небольших студий видеопродакшена: Kanban-доска, WIP-лимиты, блокировки задач и аналитика потока',
  version: '0.0.1',
  status: 'Разработка продолжается',
};

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${project.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 80px auto; padding: 0 16px; color: #1f2328; }
    h1 { font-size: 40px; margin: 0 0 12px; }
    p { font-size: 18px; margin: 8px 0; }
    .muted { color: #59636e; }
  </style>
</head>
<body>
  <h1>${project.name}</h1>
  <p>${project.description}</p>
  <p class="muted">Версия ${project.version}</p>
  <p class="muted">${project.status}</p>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`${project.name} ${project.version} запущен на порту ${PORT}`);
});
