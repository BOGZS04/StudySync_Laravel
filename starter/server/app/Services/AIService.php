<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Event;
use App\Models\StudySchedule;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AIService
{
    public function studySuggestions(User $student): array
    {
        return Cache::get($this->studySuggestionsKey($student->id), $this->fallbackStudySuggestions());
    }

    public function refreshStudySuggestions(User $student): array
    {
        $payload = [
            'pending_assignments' => Assignment::query()
                ->whereHas('classRoom.students', fn ($q) => $q->where('users.id', $student->id))
                ->with('classRoom:id,name,subject')
                ->where('due_date', '>=', now())
                ->orderBy('due_date')
                ->limit(10)
                ->get(['id', 'class_id', 'title', 'due_date'])
                ->toArray(),
            'upcoming_exams' => Event::where('user_id', $student->id)
                ->where('type', 'exam')
                ->whereBetween('start_date', [now(), now()->addDays(14)])
                ->orderBy('start_date')
                ->get(['title', 'start_date'])
                ->toArray(),
            'study_sessions' => StudySchedule::where('student_id', $student->id)
                ->whereDate('date', '>=', now()->toDateString())
                ->orderBy('date')
                ->limit(10)
                ->get(['title', 'subject', 'date', 'start_time', 'end_time'])
                ->toArray(),
        ];

        $suggestions = $this->jsonArrayCompletion(
            'You are a student academic assistant. Return a JSON array of suggested study blocks with: title, subject, recommended_date, duration_minutes, reason.',
            $payload,
            $this->fallbackStudySuggestions()
        );

        Cache::put($this->studySuggestionsKey($student->id), $suggestions, now()->addHour());

        return $suggestions;
    }

    public function progressSummary(int $classId, array $classAnalytics): string
    {
        return Cache::get($this->progressSummaryKey($classId), 'Class momentum is ready to track. Add submissions and grades to generate a stronger progress summary.');
    }

    public function refreshProgressSummary(int $classId, array $classAnalytics): string
    {
        $summary = $this->textCompletion(
            'You are an academic progress analyst. Return a concise 150-word teacher insight based on the class analytics.',
            $classAnalytics,
            'Class momentum is ready to track. Add submissions and grades to generate a stronger progress summary.'
        );

        Cache::put($this->progressSummaryKey($classId), $summary, now()->addHour());

        return $summary;
    }

    public function studySuggestionsKey(int $studentId): string
    {
        return "ai-study-suggestions-{$studentId}";
    }

    public function progressSummaryKey(int $classId): string
    {
        return "ai-progress-summary-{$classId}";
    }

    private function jsonArrayCompletion(string $systemPrompt, array $payload, array $fallback): array
    {
        $content = $this->callOpenAI($systemPrompt, $payload);
        if (!$content) {
            return $fallback;
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : $fallback;
    }

    private function textCompletion(string $systemPrompt, array $payload, string $fallback): string
    {
        return $this->callOpenAI($systemPrompt, $payload) ?: $fallback;
    }

    private function callOpenAI(string $systemPrompt, array $payload): ?string
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            return null;
        }

        $response = Http::withToken($apiKey)
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => config('services.openai.model', 'gpt-4o'),
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => json_encode($payload)],
                ],
                'temperature' => 0.3,
            ]);

        if (!$response->successful()) {
            return null;
        }

        return $response->json('choices.0.message.content');
    }

    private function fallbackStudySuggestions(): array
    {
        return [
            [
                'title' => 'Review highest-priority assignment',
                'subject' => 'General',
                'recommended_date' => now()->addDay()->toDateString(),
                'duration_minutes' => 45,
                'reason' => 'Start with the nearest pending work and protect a focused study block.',
            ],
        ];
    }
}
