<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $submission = $this->relationLoaded('submissions')
            ? $this->submissions->firstWhere('student_id', $request->user()?->id)
            : null;

        return [
            'id' => $this->id,
            'class_id' => $this->class_id,
            'teacher_id' => $this->teacher_id,
            'title' => $this->title,
            'description' => $this->description,
            'due_date' => $this->due_date->toDateTimeString(),
            'points' => $this->points !== null ? (float) $this->points : null,
            'allow_late_submission' => $this->allow_late_submission,
            'file_path' => $this->file_path,
            'file_url' => $this->file_path ? Storage::disk('public')->url($this->file_path) : null,
            'submission_status' => $submission?->status->value,
            'submissions_count' => $this->whenCounted('submissions'),
            'class' => $this->whenLoaded('classRoom', fn () => [
                'id' => $this->classRoom->id,
                'name' => $this->classRoom->name,
                'subject' => $this->classRoom->subject,
            ]),
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }
}
