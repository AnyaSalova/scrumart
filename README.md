# ScrumArt

Веб-сервис управления проектами для небольших студий видеопродакшена (Scrum и Kanban).
Лабораторная работа №1 по дисциплине «Методы и средства проектирования информационных систем»: выбор технологической платформы и первая страница проекта.

Платформа: Node.js 20 + фреймворк Express 4.21.2.

## Запуск

Образ: https://hub.docker.com/r/annasal/mispisit-lab1

```bash
docker pull annasal/mispisit-lab1:0.0.1
docker run --rm -p 8080:8080 annasal/mispisit-lab1:0.0.1
```

После запуска страница открывается по адресу http://localhost:8080

## Сборка и публикация образа (для автора)

```bash
docker login
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t annasal/mispisit-lab1:0.0.1 -t annasal/mispisit-lab1:latest --push .
```

## Состав репозитория

|Файл|Назначение|
|-|-|
|`server.js`|Express-приложение, отдаёт первую страницу|
|`package.json`, `package-lock.json`|Зависимости и их версии|
|`Dockerfile`|Описание образа|



