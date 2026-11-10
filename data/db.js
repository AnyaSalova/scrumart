// Постоянное хранение Kanban-доски ScrumArt в PostgreSQL.
// Приложение само создаёт таблицы при запуске (CREATE TABLE IF NOT EXISTS),
// поэтому после первого `docker compose up -d` доска пустая и готова к работе.

const { Pool, types } = require('pg');
const pkg = require('../package.json');

// Поле DATE отдаём строкой 'ГГГГ-ММ-ДД', без перевода в часовой пояс
types.setTypeParser(1082, (v) => v);

const APP = {
  name: 'ScrumArt',
  description: 'Веб-сервис управления проектами для небольших студий видеопродакшена',
  version: pkg.version,
};

// Адрес базы задаёт docker-compose.yml (сервис db), пароля в коде нет
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const priorities = ['Низкий', 'Средний', 'Высокий'];

// Настройка доски: стадии видеопроизводства и WIP-лимиты (NULL — без лимита).
// Это часть структуры, а не демо-записи: без колонок доску не построить.
const COLUMNS = [
  ['brief', 'Бриф', 3, 1],
  ['script', 'Сценарий', 2, 2],
  ['shooting', 'Съёмка', 2, 3],
  ['editing', 'Монтаж', 2, 4],
  ['review', 'Согласование', 2, 5],
  ['done', 'Готово', null, 6],
];

// Состав команды студии — из кого выбирается исполнитель карточки
const MEMBERS = [
  ['Анна Салова', 'Продюсер'],
  ['Илья Морозов', 'Монтажёр'],
  ['Дарья Ким', 'Режиссёр'],
  ['Максим Орлов', 'Оператор'],
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS board_columns (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  wip_limit  INTEGER CHECK (wip_limit > 0),
  position   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL CHECK (title <> ''),
  description   TEXT NOT NULL DEFAULT '',
  column_id     TEXT NOT NULL REFERENCES board_columns(id),
  assignee_id   INTEGER NOT NULL REFERENCES members(id),
  priority      TEXT NOT NULL CHECK (priority IN ('Низкий', 'Средний', 'Высокий')),
  deadline      DATE,
  blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason  TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wip_refusals (
  id           SERIAL PRIMARY KEY,
  attempted_by TEXT NOT NULL,
  card_title   TEXT NOT NULL,
  column_id    TEXT NOT NULL REFERENCES board_columns(id),
  cards_count  INTEGER NOT NULL,
  wip_limit    INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// База в соседнем контейнере может стартовать дольше приложения —
// повторяем попытку подключения, пока она не начнёт принимать запросы.
async function init({ attempts = 30, delayMs = 2000 } = {}) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`База ещё не готова (${err.code || err.message}), попытка ${i}/${attempts}…`);
      await sleep(delayMs);
    }
  }
  await pool.query(SCHEMA);
  for (const [id, title, wip, position] of COLUMNS) {
    await pool.query(
      'INSERT INTO board_columns (id, title, wip_limit, position) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, title, wip, position],
    );
  }
  for (const [fullName, role] of MEMBERS) {
    await pool.query('INSERT INTO members (full_name, role) VALUES ($1, $2) ON CONFLICT (full_name) DO NOTHING', [fullName, role]);
  }
  console.log('Схема базы готова');
}

const CARD_SELECT = `
  SELECT c.id, c.title, c.description, c.column_id AS column, c.priority, c.deadline,
         c.blocked, c.block_reason AS "blockReason", c.created_at AS "createdAt",
         c.assignee_id AS "assigneeId", m.full_name AS assignee, m.role AS "assigneeRole"
  FROM cards c JOIN members m ON m.id = c.assignee_id`;

async function getColumns() {
  const { rows } = await pool.query(`
    SELECT b.id, b.title, b.wip_limit AS wip, COUNT(c.id)::int AS count
    FROM board_columns b LEFT JOIN cards c ON c.column_id = b.id
    GROUP BY b.id ORDER BY b.position`);
  return rows.map((col) => ({ ...col, full: col.wip !== null && col.count >= col.wip }));
}

async function getColumn(id) {
  const cols = await getColumns();
  return cols.find((c) => c.id === id) || null;
}

async function getMembers() {
  const { rows } = await pool.query('SELECT id, full_name AS "fullName", role FROM members ORDER BY id');
  return rows;
}

async function getCards() {
  const { rows } = await pool.query(`${CARD_SELECT} ORDER BY c.id`);
  return rows;
}

async function getCard(id) {
  const { rows } = await pool.query(`${CARD_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function addCard(form) {
  const { rows } = await pool.query(
    `INSERT INTO cards (title, description, column_id, assignee_id, priority, deadline)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [form.title, form.description, form.column, form.assigneeId, form.priority, form.deadline || null],
  );
  return rows[0].id;
}

async function addRefusal(r) {
  await pool.query(
    'INSERT INTO wip_refusals (attempted_by, card_title, column_id, cards_count, wip_limit) VALUES ($1, $2, $3, $4, $5)',
    [r.who, r.title, r.columnId, r.count, r.wip],
  );
}

async function getLastRefusal() {
  const { rows } = await pool.query(`
    SELECT r.attempted_by AS who, r.card_title AS title, b.title AS column,
           r.cards_count AS count, r.wip_limit AS wip, r.created_at AS at
    FROM wip_refusals r JOIN board_columns b ON b.id = r.column_id
    ORDER BY r.id DESC LIMIT 1`);
  return rows[0] || null;
}

module.exports = {
  APP, priorities, pool, init,
  getColumns, getColumn, getMembers, getCards, getCard, addCard, addRefusal, getLastRefusal,
};
