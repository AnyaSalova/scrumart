// Три главные функции Kanban-модуля ScrumArt (данные — в PostgreSQL):
//   1) создать карточку задачи      — GET /cards/new, POST /cards  (изменение данных)
//   2) посмотреть Kanban-доску      — GET /board, GET /cards/:id   (просмотр)
//   3) отказ при превышении WIP     — GET /wip-exceeded            (ошибочный сценарий)

const express = require('express');
const db = require('../data/db');

const router = express.Router();

// Express 4 не ловит ошибки async-функций сам — передаём их в обработчик ошибок
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const fmtTime = (d) => new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Samara' });

// Главная: название продукта, версия и переход к действиям
router.get('/', wrap(async (req, res) => {
  const [columns, cards] = await Promise.all([db.getColumns(), db.getCards()]);
  const stats = {
    total: cards.length,
    blocked: cards.filter((c) => c.blocked).length,
    full: columns.filter((c) => c.full).map((c) => c.title),
  };
  res.render('index', { title: 'Главная', stats });
}));

// Функция 2. Просмотр: Kanban-доска со всеми колонками и WIP-лимитами
router.get('/board', wrap(async (req, res) => {
  const [columns, cards] = await Promise.all([db.getColumns(), db.getCards()]);
  const view = columns.map((col) => ({ ...col, cards: cards.filter((c) => c.column === col.id) }));
  res.render('board', { title: 'Kanban-доска', columns: view, total: cards.length });
}));

async function renderForm(res, form, errors, status = 200) {
  const [columns, members] = await Promise.all([db.getColumns(), db.getMembers()]);
  res.status(status).render('new-card', {
    title: 'Новая карточка', form, errors, columns, members, priorities: db.priorities,
  });
}

router.get('/cards/new', wrap(async (req, res) => {
  await renderForm(res, { column: 'brief', priority: 'Средний' }, []);
}));

// Карточка одной задачи
router.get('/cards/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const card = Number.isInteger(id) && id > 0 && id < 2147483647 ? await db.getCard(id) : null;
  if (!card) {
    return res.status(404).render('not-found', {
      title: 'Карточка не найдена',
      what: `Открыть карточку №${req.params.id}`,
      why: 'Карточки с таким номером нет на доске.',
    });
  }
  const column = await db.getColumn(card.column);
  res.render('card', { title: card.title, card, column, created: req.query.created === '1', fmtTime });
}));

// Функция 1. Изменение данных: создание карточки в базе
router.post('/cards', wrap(async (req, res) => {
  const form = {
    title: (req.body.title || '').trim(),
    assigneeId: Number(req.body.assigneeId) || null,
    column: req.body.column,
    priority: req.body.priority,
    deadline: req.body.deadline || '',
    description: (req.body.description || '').trim(),
  };

  const [column, members] = await Promise.all([db.getColumn(form.column), db.getMembers()]);

  // Ошибочный ввод — форма показывается снова с текстом ошибок
  const errors = [];
  if (!form.title) errors.push('Название задачи не заполнено.');
  if (!column) errors.push('Выбрана несуществующая колонка.');
  if (!members.some((m) => m.id === form.assigneeId)) errors.push('Исполнитель не выбран.');
  if (!db.priorities.includes(form.priority)) errors.push('Недопустимый приоритет.');
  if (form.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)) errors.push('Дедлайн указан в неверном формате.');
  if (errors.length) return renderForm(res, form, errors, 422);

  // Функция 3. Отказ: колонка уже заполнена до WIP-лимита — отказ тоже пишется в базу
  if (column.full) {
    await db.addRefusal({ who: 'Продюсер', title: form.title, columnId: column.id, count: column.count, wip: column.wip });
    return res.redirect(303, '/wip-exceeded');
  }

  const id = await db.addCard(form);
  res.redirect(303, `/cards/${id}?created=1`);
}));

// Страница отказа: кто пытался, что и почему система не приняла
router.get('/wip-exceeded', wrap(async (req, res) => {
  let refusal = await db.getLastRefusal();
  let example = false;
  if (refusal) {
    refusal.at = fmtTime(refusal.at);
  } else {
    // Отказов ещё не было — показываем, что произойдёт с заполненной колонкой
    const columns = await db.getColumns();
    const col = columns.find((c) => c.full) || columns.find((c) => c.id === 'editing');
    refusal = { who: 'Продюсер', title: 'Новая задача', column: col.title, count: col.wip, wip: col.wip };
    example = true;
  }
  res.status(409).render('wip-exceeded', { title: 'Отказ: превышен WIP-лимит', refusal, example });
}));

module.exports = router;
