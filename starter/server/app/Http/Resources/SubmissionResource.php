<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

class SubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment_id' => $this->assignment_id,
            'student_id' => $this->student_id,
            'content' => $this->content,
            'file_path' => $this->file_path,
            'file_url' => $this->file_path
                ? URL::temporarySignedRoute('api.submissions.download', now()->addHour(), ['id' => $this->id])
                : null,
            'status' => $this->status->value,
            'grade' => $this->grade !== null ? (float) $this->grade : null,
            'feedback' => $this->feedback,
            'submitted_at' => $this->submitted_at?->toDateTimeString(),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'avatar' => $this->student->avatar,
                'slug' => $this->student->slug,
            ]),
            'assignment' => $this->whenLoaded('assignment', fn () => [
                'id' => $this->assignment->id,
                'title' => $this->assignment->title,
                'points' => $this->assignment->points !== null ? (float) $this->assignment->points : null,
            ]),
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }
}
