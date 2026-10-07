// Три главные функции Kanban-модуля ScrumArt:
//   1) создать карточку задачи      — GET /cards/new, POST /cards  (изменение данных)
//   2) посмотреть Kanban-доску      — GET /board, GET /cards/:id   (просмотр)
//   3) отказ при превышении WIP     — GET /wip-exceeded            (ошибочный сценарий)

const express = require('express');
const board = require('../data/board');

const router = express.Router();

// Главная: название продукта и переход к действиям
router.get('/', (req, res) => {
  const stats = {
    total: board.cards.length,
    blocked: board.cards.filter((c) => c.blocked).length,
    full: board.columns.filter((c) => board.isFull(c.id)).map((c) => c.title),
  };
  res.render('index', { title: 'Главная', stats });
});

// Функция 2. Просмотр: Kanban-доска со всеми колонками и WIP-лимитами
router.get('/board', (req, res) => {
  const columns = board.columns.map((col) => ({
    ...col,
    cards: board.cardsIn(col.id),
    full: board.isFull(col.id),
  }));
  res.render('board', { title: 'Kanban-доска', columns });
});

// Карточка одной задачи
router.get('/cards/new', (req, res) => {
  res.render('new-card', { title: 'Новая карточка', form: { column: 'brief', priority: 'Средний' }, errors: [] });
});

router.get('/cards/:id', (req, res) => {
  const card = board.cards.find((c) => c.id === Number(req.params.id));
  if (!card) {
    return res.status(404).render('not-found', {
      title: 'Карточка не найдена',
      what: `Открыть карточку №${req.params.id}`,
      why: 'Карточки с таким номером нет на доске.',
    });
  }
  res.render('card', { title: card.title, card, column: board.getColumn(card.column), created: req.query.created === '1' });
});

// Функция 1. Изменение данных: создание карточки
router.post('/cards', (req, res) => {
  const form = {
    title: (req.body.title || '').trim(),
    assignee: req.body.assignee,
    column: req.body.column,
    priority: req.body.priority,
    deadline: req.body.deadline || '',
    description: (req.body.description || '').trim(),
  };

  // Ошибочный сценарий: недопустимые данные — форма показывается снова с текстом ошибки
  const errors = [];
  if (!form.title) errors.push('Название задачи не заполнено.');
  if (!board.getColumn(form.column)) errors.push('Выбрана несуществующая колонка.');
  if (!board.people.includes(form.assignee)) errors.push('Исполнитель не выбран.');
  if (!board.priorities.includes(form.priority)) errors.push('Недопустимый приоритет.');
  if (errors.length) {
    return res.status(422).render('new-card', { title: 'Новая карточка', form, errors });
  }

  // Функция 3. Отказ: колонка уже заполнена до WIP-лимита
  if (board.isFull(form.column)) {
    const col = board.getColumn(form.column);
    board.setRefusal({
      who: 'Продюсер',
      title: form.title,
      column: col.title,
      count: board.cardsIn(col.id).length,
      wip: col.wip,
      at: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Samara' }),
    });
    return res.redirect(303, '/wip-exceeded');
  }

  const card = board.addCard(form);
  res.redirect(303, `/cards/${card.id}?created=1`);
});

// Страница отказа: кто пытался, что и почему система не приняла
router.get('/wip-exceeded', (req, res) => {
  let refusal = board.getRefusal();
  let example = false;
  if (!refusal) {
    // Отказов ещё не было — показываем, что произойдёт с заполненной колонкой
    const col = board.columns.find((c) => board.isFull(c.id)) || board.columns[3];
    refusal = { who: 'Продюсер', title: 'Новая задача', column: col.title, count: board.cardsIn(col.id).length, wip: col.wip };
    example = true;
  }
  res.status(409).render('wip-exceeded', { title: 'Отказ: превышен WIP-лимит', refusal, example });
});

module.exports = router;
