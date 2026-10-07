// Демо-данные Kanban-доски. Хранятся в оперативной памяти:
// новые карточки живут, пока запущен контейнер.

const APP = {
  name: 'ScrumArt',
  description: 'Веб-сервис управления проектами для небольших студий видеопродакшена',
  version: '0.0.2',
};

// Колонки — стадии видеопроизводства, у каждой WIP-лимит (null — без лимита)
const columns = [
  { id: 'brief',    title: 'Бриф',         wip: 3 },
  { id: 'script',   title: 'Сценарий',     wip: 2 },
  { id: 'shooting', title: 'Съёмка',       wip: 2 },
  { id: 'editing',  title: 'Монтаж',       wip: 2 },
  { id: 'review',   title: 'Согласование', wip: 2 },
  { id: 'done',     title: 'Готово',       wip: null },
];

const people = ['Анна Салова', 'Илья Морозов', 'Дарья Ким', 'Максим Орлов'];
const priorities = ['Низкий', 'Средний', 'Высокий'];

const cards = [
  { id: 1, title: 'Рекламный ролик кофейни «Зерно»', column: 'editing',  assignee: 'Илья Морозов', priority: 'Высокий', deadline: '2026-10-15', blocked: false, blockReason: '', description: 'Ролик 30 секунд для соцсетей, черновой монтаж по сценарию v2.' },
  { id: 2, title: 'Корпоративный фильм «Волга-Агро»',  column: 'editing',  assignee: 'Дарья Ким',    priority: 'Средний', deadline: '2026-10-20', blocked: true,  blockReason: 'Ждём от заказчика логотипы в векторе', description: 'Фильм о компании, 5 минут, монтаж интервью.' },
  { id: 3, title: 'Клип группы «Северный ветер»',      column: 'shooting', assignee: 'Максим Орлов', priority: 'Высокий', deadline: '2026-10-12', blocked: false, blockReason: '', description: 'Съёмка на натуре, 2 смены.' },
  { id: 4, title: 'Тизер фестиваля «Ульяновск-Арт»',   column: 'script',   assignee: 'Анна Салова',  priority: 'Средний', deadline: '2026-10-25', blocked: false, blockReason: '', description: 'Сценарий тизера на 15 секунд.' },
  { id: 5, title: 'Видеоотзыв клиники «Здоровье»',     column: 'brief',    assignee: 'Анна Салова',  priority: 'Низкий',  deadline: '2026-11-01', blocked: false, blockReason: '', description: 'Собрать бриф и список вопросов для интервью.' },
  { id: 6, title: 'Документальный фильм о заводе',     column: 'review',   assignee: 'Илья Морозов', priority: 'Высокий', deadline: '2026-10-10', blocked: false, blockReason: '', description: 'Финальная версия отправлена заказчику на согласование.' },
  { id: 7, title: 'Промо мобильного приложения',       column: 'done',     assignee: 'Дарья Ким',    priority: 'Средний', deadline: '2026-09-30', blocked: false, blockReason: '', description: 'Сдано заказчику.' },
];

let nextId = cards.length + 1;
let lastRefusal = null;

function getColumn(id) {
  return columns.find((c) => c.id === id);
}

function cardsIn(columnId) {
  return cards.filter((c) => c.column === columnId);
}

function isFull(columnId) {
  const col = getColumn(columnId);
  return col && col.wip !== null && cardsIn(columnId).length >= col.wip;
}

function addCard(data) {
  const card = { id: nextId++, blocked: false, blockReason: '', ...data };
  cards.push(card);
  return card;
}

module.exports = {
  APP, columns, people, priorities, cards,
  getColumn, cardsIn, isFull, addCard,
  getRefusal: () => lastRefusal,
  setRefusal: (r) => { lastRefusal = r; },
};
