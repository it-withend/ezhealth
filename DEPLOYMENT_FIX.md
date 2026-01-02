# Исправление проблемы с API (404 ошибки)

## Проблема
Все API запросы возвращают 404 ошибку. Это означает, что бэкенд на Render не обновился или не запущен.

## Решение

### 1. Проверьте, что бэкенд запущен на Render
1. Зайдите на https://dashboard.render.com
2. Найдите ваш сервис `health-backend`
3. Проверьте статус - должен быть "Live" (зеленый)
4. Если статус "Failed" или "Stopped" - нажмите "Manual Deploy" → "Deploy latest commit"

### 2. Проверьте переменные окружения на Render
В настройках сервиса (`health-backend`) → Environment должны быть:
- `NODE_ENV=production`
- `PORT=10000`
- `TELEGRAM_BOT_TOKEN=ваш_токен`
- `OPENAI_API_KEY=ваш_ключ` ⚠️ **ВАЖНО: Добавьте этот ключ!**

### 3. Проверьте логи бэкенда на Render
1. В Render Dashboard → ваш сервис → Logs
2. Должны быть строки:
   - `✅ Server is running on port 10000`
   - `Connected to SQLite database`
   - `Database initialized`
3. Если есть ошибки - исправьте их

### 4. Проверьте URL бэкенда
1. В Render Dashboard → ваш сервис → Settings
2. Найдите "Service URL" (например: `https://health-backend-xxxx.onrender.com`)
3. Убедитесь, что в `frontend/src/services/api.js` или `.env` файле указан правильный URL:
   ```
   REACT_APP_API_URL=https://ваш-backend-url.onrender.com/api
   ```

### 5. Перезапустите бэкенд
1. В Render Dashboard → ваш сервис → Manual Deploy
2. Выберите "Deploy latest commit"
3. Дождитесь завершения деплоя (обычно 2-3 минуты)

### 6. Проверьте, что все файлы закоммичены
Убедитесь, что все изменения в `backend/` закоммичены и запушены в GitHub:
```bash
git status
git add .
git commit -m "Fix API routes"
git push
```

### 7. После деплоя проверьте
Откройте в браузере: `https://ваш-backend-url.onrender.com/api/health-check`
Должен вернуться JSON: `{"status":"ok","message":"Server is running"}`

Если возвращается 404 - значит бэкенд не запущен или URL неправильный.

## Быстрая проверка
1. Откройте консоль браузера (F12)
2. Выполните: `fetch('https://ваш-backend-url.onrender.com/api/health-check').then(r => r.json()).then(console.log)`
3. Если видите `{"status":"ok"}` - бэкенд работает
4. Если видите ошибку - проверьте шаги выше

