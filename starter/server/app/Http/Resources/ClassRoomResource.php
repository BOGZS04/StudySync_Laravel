<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassRoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'teacher_id' => $this->teacher_id,
            'name' => $this->name,
            'subject' => $this->subject,
            'section' => $this->section,
            'class_code' => $this->class_code,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'students_count' => $this->whenCounted('students'),
            'assignments_count' => $this->whenCounted('assignments'),
            'teacher' => $this->whenLoaded('teacher', fn () => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
                'avatar' => $this->teacher->avatar,
            ]),
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }
}
