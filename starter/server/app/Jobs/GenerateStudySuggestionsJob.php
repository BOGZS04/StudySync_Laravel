<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\AIService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateStudySuggestionsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $studentId)
    {
    }

    public function handle(AIService $ai): void
    {
        $student = User::find($this->studentId);
        if ($student) {
            $ai->refreshStudySuggestions($student);
        }
    }
}
