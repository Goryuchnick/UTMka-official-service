# API Specification — UTMka Web Service

**Версия API:** v1  
**Base URL:** `https://utmka.ru/api/v1`

---

## Аутентификация

Все защищённые эндпоинты требуют JWT токен в заголовке:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### Auth — Авторизация

#### POST /auth/register
Регистрация нового пользователя по email.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Имя пользователя"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Письмо с подтверждением отправлено на user@example.com",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Имя пользователя",
    "email_verified": false
  }
}
```

**Errors:**
- `400` — Невалидные данные
- `409` — Email уже зарегистрирован

---

#### POST /auth/login
Авторизация по email и паролю.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Имя пользователя",
    "subscription": {
      "plan": "trial",
      "expires_at": "2026-01-26T00:00:00Z",
      "is_active": true
    }
  }
}
```

**Errors:**
- `401` — Неверный email или пароль
- `403` — Email не подтверждён

---

#### POST /auth/refresh
Обновление access токена.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

---

#### POST /auth/logout
Выход из системы (инвалидация токенов).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Вы вышли из системы"
}
```

---

#### GET /auth/me
Получение информации о текущем пользователе.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Имя пользователя",
  "email_verified": true,
  "created_at": "2026-01-19T10:00:00Z",
  "oauth_providers": ["yandex", "google"],
  "subscription": {
    "plan": "pro",
    "expires_at": "2026-02-19T00:00:00Z",
    "is_active": true,
    "auto_renew": true
  }
}
```

---

### OAuth — Социальная авторизация

#### GET /auth/yandex
Редирект на страницу авторизации Яндекс.

**Query params:**
- `redirect_uri` (optional) — URL для возврата после авторизации

**Response:** 302 Redirect to Yandex OAuth

---

#### GET /auth/yandex/callback
Callback после авторизации через Яндекс.

**Query params:**
- `code` — код авторизации от Яндекс

**Response (200):** Редирект на фронтенд с токенами в URL hash или cookies

---

#### GET /auth/vk
Редирект на страницу авторизации VK.

**Response:** 302 Redirect to VK OAuth

---

#### GET /auth/vk/callback
Callback после авторизации через VK.

---

#### GET /auth/google
Редирект на страницу авторизации Google.

**Response:** 302 Redirect to Google OAuth

---

#### GET /auth/google/callback
Callback после авторизации через Google.

---

### History — История UTM-меток

#### GET /api/history
Получение истории пользователя.

**Headers:** `Authorization: Bearer <token>`

**Query params:**
- `page` (default: 1) — номер страницы
- `per_page` (default: 50, max: 100) — записей на страницу
- `search` — поиск по URL или UTM параметрам
- `date_from` — фильтр по дате (ISO 8601)
- `date_to` — фильтр по дате (ISO 8601)

**Response (200):**
```json
{
  "items": [
    {
      "id": 123,
      "base_url": "https://example.com",
      "full_url": "https://example.com?utm_source=google&utm_medium=cpc",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "brand",
      "utm_content": "banner1",
      "utm_term": "utm генератор",
      "short_url": "https://clck.ru/abc123",
      "created_at": "2026-01-19T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_items": 150,
    "total_pages": 3
  }
}
```

**Errors:**
- `401` — Не авторизован
- `403` — Подписка не активна (для бесплатных пользователей)

---

#### POST /api/history
Добавление записи в историю.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "url": "https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=brand"
}
```

**Response (201):**
```json
{
  "success": true,
  "id": 124,
  "message": "Запись добавлена в историю"
}
```

---

#### DELETE /api/history/{id}
Удаление записи из истории.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Запись удалена"
}
```

---

#### PUT /api/history/{id}/short_url
Обновление короткой ссылки для записи.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "short_url": "https://clck.ru/xyz789"
}
```

**Response (200):**
```json
{
  "success": true,
  "short_url": "https://clck.ru/xyz789"
}
```

---

#### POST /api/history/export
Экспорт истории в файл.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "format": "json"  // или "csv"
}
```

**Response (200):**
```json
{
  "success": true,
  "download_url": "/api/download/history_export_123.json",
  "expires_at": "2026-01-19T16:30:00Z"
}
```

---

### Templates — Шаблоны UTM

#### GET /api/templates
Получение шаблонов пользователя.

**Headers:** `Authorization: Bearer <token>`

**Query params:**
- `page` (default: 1)
- `per_page` (default: 50)
- `search` — поиск по имени
- `tag` — фильтр по тегу

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Google Ads - Бренд",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "brand",
      "utm_content": null,
      "utm_term": null,
      "tag_name": "Google",
      "tag_color": "#4285F4",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_items": 25,
    "total_pages": 1
  }
}
```

---

#### POST /api/templates
Создание шаблона.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Facebook - Ретаргетинг",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "retargeting",
  "utm_content": "carousel",
  "utm_term": null,
  "tag_name": "Facebook",
  "tag_color": "#1877F2"
}
```

**Response (201):**
```json
{
  "success": true,
  "id": 26,
  "message": "Шаблон создан"
}
```

---

#### DELETE /api/templates/{id}
Удаление шаблона.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Шаблон удалён"
}
```

---

#### POST /api/templates/import
Импорт шаблонов из файла.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "templates": [
    {
      "name": "Template 1",
      "utm_source": "source1",
      "utm_medium": "medium1"
    },
    {
      "name": "Template 2",
      "utm_source": "source2",
      "utm_medium": "medium2"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "imported_count": 2,
  "message": "Импортировано 2 шаблона"
}
```

---

#### POST /api/templates/export
Экспорт шаблонов в файл.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "format": "json"
}
```

**Response (200):**
```json
{
  "success": true,
  "download_url": "/api/download/templates_export_123.json",
  "expires_at": "2026-01-19T16:30:00Z"
}
```

---

### Subscription — Подписки

#### GET /api/subscription/status
Получение статуса подписки.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "plan": "pro",
  "status": "active",
  "started_at": "2026-01-01T00:00:00Z",
  "expires_at": "2026-02-01T00:00:00Z",
  "auto_renew": true,
  "trial_used": true,
  "features": {
    "history": true,
    "templates": true,
    "export": true,
    "max_history_items": -1,
    "max_templates": -1
  }
}
```

---

#### GET /api/subscription/plans
Получение доступных тарифов.

**Response (200):**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Бесплатный",
      "price": 0,
      "currency": "RUB",
      "period": null,
      "features": {
        "history": false,
        "templates": false,
        "export": false
      }
    },
    {
      "id": "trial",
      "name": "Пробный период",
      "price": 0,
      "currency": "RUB",
      "period": "7 дней",
      "features": {
        "history": true,
        "templates": true,
        "export": true
      }
    },
    {
      "id": "pro_monthly",
      "name": "Pro (месяц)",
      "price": 149,
      "currency": "RUB",
      "period": "месяц",
      "features": {
        "history": true,
        "templates": true,
        "export": true
      }
    },
    {
      "id": "pro_yearly",
      "name": "Pro (год)",
      "price": 999,
      "currency": "RUB",
      "period": "год",
      "discount": "44%",
      "features": {
        "history": true,
        "templates": true,
        "export": true
      }
    }
  ]
}
```

---

#### POST /api/subscription/activate-trial
Активация пробного периода.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Пробный период активирован на 7 дней",
  "expires_at": "2026-01-26T00:00:00Z"
}
```

**Errors:**
- `400` — Пробный период уже был использован

---

### Payment — Оплата

#### POST /api/payment/create
Создание платежа.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "plan_id": "pro_monthly",
  "return_url": "https://utmka.ru/payment/success"
}
```

**Response (200):**
```json
{
  "success": true,
  "payment_id": "pay_123456",
  "confirmation_url": "https://yookassa.ru/checkout/...",
  "amount": 149,
  "currency": "RUB"
}
```

---

#### POST /api/payment/webhook
Webhook от платёжной системы (ЮKassa).

**Headers:** `X-Webhook-Signature: <signature>`

**Request (from YooKassa):**
```json
{
  "type": "notification",
  "event": "payment.succeeded",
  "object": {
    "id": "pay_123456",
    "status": "succeeded",
    "amount": {
      "value": "149.00",
      "currency": "RUB"
    },
    "metadata": {
      "user_id": 1,
      "plan_id": "pro_monthly"
    }
  }
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### POST /api/subscription/cancel
Отмена автопродления подписки.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Автопродление отменено. Подписка активна до 2026-02-01"
}
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request — невалидные данные |
| 401 | Unauthorized — требуется авторизация |
| 403 | Forbidden — нет доступа (подписка не активна) |
| 404 | Not Found — ресурс не найден |
| 409 | Conflict — ресурс уже существует |
| 422 | Unprocessable Entity — ошибка валидации |
| 429 | Too Many Requests — превышен лимит запросов |
| 500 | Internal Server Error — ошибка сервера |

---

## Rate Limiting

| Endpoint | Лимит |
|----------|-------|
| /auth/* | 10 req/min |
| /api/history | 60 req/min |
| /api/templates | 60 req/min |
| /api/payment/* | 5 req/min |

---

*Последнее обновление: 19.01.2026*
