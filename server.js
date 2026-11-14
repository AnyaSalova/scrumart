const path = require('path');
const express = require('express');
const cardsRouter = require('./routes/cards');
const db = require('./data/db');

const app = express();
const PORT = process.env.PORT || 8080;

// Страницы собирает шаблонизатор EJS из папки views/
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Общие данные для шапки и подвала каждой страницы
app.use((req, res, next) => {
  res.locals.app = db.APP;
  res.locals.path = req.path;
  next();
});

app.use('/', cardsRouter);

// Любой неизвестный адрес
app.use((req, res) => {
  res.status(404).render('not-found', { title: 'Страница не найдена', what: `Открыть адрес ${req.path}`, why: 'Такой страницы в ScrumArt нет.' });
});

// Ошибка базы или кода — понятная страница вместо трассировки
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('not-found', { title: 'Ошибка сервера', what: `Открыть адрес ${req.path}`, why: 'База данных недоступна или произошла внутренняя ошибка. Попробуйте обновить страницу.' });
});

// Сначала дожидаемся базы и создаём схему, потом принимаем запросы
db.init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${db.APP.name} ${db.APP.version} запущен на порту ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Не удалось подключиться к базе:', err.message);
    process.exit(1);
  });
