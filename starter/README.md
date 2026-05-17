# StudySync

StudySync is a student academic productivity app built from the FEGURO React/Laravel starter. It supports role-based workflows for admins, teachers, and students.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS v4
- Laravel 12, Sanctum, MySQL
- Laravel queues and scheduler
- Pusher/Soketi-ready broadcasting
- OpenAI/Resend-ready service configuration

## Local Setup

### Server

```bash
cd server
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve
```

Default local database:

```env
DB_DATABASE=server
DB_USERNAME=root
DB_PASSWORD=
```

### Client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Default client environment:

```env
VITE_API_URL=http://localhost:8000
VITE_STORAGE_URL=http://localhost:8000/storage
```

## Seeded Accounts

All seeded accounts use:

```text
Password1!
```

Examples:

```text
Admin: admin@studysync.test
Teacher: mara.santos@studysync.test
Student: alyssa.cruz@studysync.test
```

## Main Workflows

1. Teacher logs in and creates a class from `/app/teacher/classes`.
2. Student logs in and joins the class from `/app/assignments` using the class code.
3. Teacher creates an assignment from `/app/teacher/assignments`.
4. Student sees the assignment at `/app/assignments` and submits work from the detail page.
5. Teacher reviews the submission from `/app/teacher/submissions`.
6. Student sees grade and feedback on their assignment/submission pages.

## Useful Commands

```bash
# server
php artisan test
php artisan schedule:list
php artisan queue:work

# client
npm run lint
npm run build
```

## Optional Integrations

Set these when enabling production-grade mail, AI, and realtime features:

```env
OPENAI_API_KEY=
RESEND_API_KEY=
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=
```

