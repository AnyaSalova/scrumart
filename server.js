const path = require('path');
const express = require('express');
const cardsRouter = require('./routes/cards');
const { APP } = require('./data/board');

const app = express();
const PORT = process.env.PORT || 8080;

// Страницы собирает шаблонизатор EJS из папки views/
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Общие данные для шапки и подвала каждой страницы
app.use((req, res, next) => {
  res.locals.app = APP;
  res.locals.path = req.path;
  next();
});

app.use('/', cardsRouter);

// Любой неизвестный адрес
app.use((req, res) => {
  res.status(404).render('not-found', { title: 'Страница не найдена', what: `Открыть адрес ${req.path}`, why: 'Такой страницы в ScrumArt нет.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`${APP.name} ${APP.version} запущен на порту ${PORT}`);
});
