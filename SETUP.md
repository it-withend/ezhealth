# Инструкция по настройке

## Backend

1. **Создайте файл `.env` в папке `backend/`** со следующим содержимым:
```
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=sk-
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

2. **Установите зависимости** (если еще не установлены):
```bash
cd backend
npm install
```

3. **Запустите сервер**:
```bash
npm start
```

## Frontend

1. **Создайте файл `.env` в папке `frontend/`** (если еще не создан):
```
REACT_APP_API_URL=http://localhost:3000/api
```

2. **Установите зависимости** (если еще не установлены):
```bash
cd frontend
npm install
```

3. **Запустите фронтенд**:
```bash
npm start
```

## Реализованный функционал

✅ **Дневник анализов и снимков** - полная CRUD функциональность с загрузкой файлов
✅ **Контроль пульса и сна** - добавление метрик, графики, статистика
✅ **Отправка данных доверенным людям** - API для отправки данных контактам
✅ **Уведомления при критических показателях** - автоматическая проверка и логирование
✅ **ИИ-чат для консультаций** - подключен реальный OpenAI API
✅ **Генерация краткого пересказа для врача** - через OpenAI API
✅ **Графики состояния здоровья** - визуализация всех метрик
✅ **Напоминания о приёме лекарств** - полная функциональность с логами
✅ **Напоминания о привычках** - вода, витамины, прогулки и другие

## База данных

База данных автоматически создается при первом запуске сервера. Все таблицы создаются автоматически:
- users
- health_metrics
- medical_analyses
- medications
- medication_logs
- habits
- habit_logs
- trusted_contacts

## API Endpoints

- `GET /api/health/metrics` - получить метрики
- `POST /api/health/metrics` - добавить метрику
- `GET /api/health/metrics/stats` - статистика для графиков
- `GET /api/analysis` - получить анализы
- `POST /api/analysis` - добавить анализ (с файлом)
- `GET /api/reminders` - получить напоминания
- `POST /api/reminders` - добавить напоминание
- `POST /api/reminders/log` - отметить выполнение
- `GET /api/contacts` - получить контакты
- `POST /api/contacts/share` - отправить данные контактам
- `POST /api/ai/analyze` - AI чат
- `POST /api/ai/analyze-file` - анализ файла
- `POST /api/ai/generate-report` - генерация отчета
- `GET /api/alerts` - получить уведомления

Все защищенные роуты требуют авторизации через Telegram initData.

